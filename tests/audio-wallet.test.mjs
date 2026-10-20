import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { requireVerifiedIdentity, IdentityError } from '../worker/src/identity.mjs';
import { reserveJob, walletBalance, finalizeJob, refundJob, markJobUnknown, CreditError } from '../worker/src/wallet.mjs';

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

function independentAudioDb() {
  const database = new DatabaseSync(':memory:');
  database.exec(readFileSync(new URL('../worker/migrations/0001_audio_wallet.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../worker/migrations/0002_audio_settlement.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../worker/migrations/0003_audio_generation_assets.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../worker/migrations/0004_remove_audio_asset_storage.sql', import.meta.url), 'utf8'));
  // This fixture runs the actual migration against a distinct in-memory SQLite
  // database; it intentionally has no RES users/credits tables or bindings.
  database.prepare('INSERT INTO audio_wallets (user_id, balance) VALUES (?, ?)').run(identity.userId, 10);
  database.prepare("INSERT INTO audio_credit_ledger (user_id, delta, event_type, event_key) VALUES (?, ?, 'grant', ?)")
    .run(identity.userId, 10, 'seed-grant');
  const d1 = {
    prepare(sql) {
      return { bind(...values) {
        return {
          sql, values,
          async first() { return database.prepare(sql).get(...values) ?? null; },
          async all() { return { results: database.prepare(sql).all(...values) }; },
          async run() { return database.prepare(sql).run(...values); },
        };
      } };
    },
    async batch(statements) {
      database.exec('BEGIN');
      try {
        const result = statements.map(statement => ({ meta: database.prepare(statement.sql).run(...statement.values) }));
        database.exec('COMMIT');
        return result;
      } catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
  return { database, d1 };
}

test('real Audio D1 migration debits once, handles conflicts/failures atomically, and stays separate from RES image credits', async () => {
  const { database, d1 } = independentAudioDb();
  try {
    assert.equal(await walletBalance(d1, identity), 10);
    const first = await reserveJob(d1, identity, { jobId: 'jobfirst123', idempotencyKey: 'keyfirst123', kind: 'sfx', cost: 3 });
    assert.deepEqual(first, { jobId: 'jobfirst123', status: 'reserved', reused: false });
    assert.equal(await walletBalance(d1, identity), 7);
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM audio_generation_jobs').get().n, 1);
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM audio_credit_ledger WHERE event_type = 'reserve'").get().n, 1);

    const retry = await reserveJob(d1, identity, { jobId: 'jobretry123', idempotencyKey: 'keyfirst123', kind: 'sfx', cost: 3 });
    assert.deepEqual(retry, { jobId: 'jobfirst123', status: 'reserved', reused: true });
    assert.equal(await walletBalance(d1, identity), 7);
    await assert.rejects(reserveJob(d1, identity, { jobId: 'jobconflict1', idempotencyKey: 'keyfirst123', kind: 'bgm', cost: 4 }), error => error.code === 'IDEMPOTENCY_CONFLICT');
    await assert.rejects(reserveJob(d1, identity, { jobId: 'jobpoor123', idempotencyKey: 'keypoor123', kind: 'bgm', cost: 8 }), error => error.code === 'CREDITS_INSUFFICIENT');
    assert.equal(await walletBalance(d1, identity), 7);

    await reserveJob(d1, identity, { jobId: 'jobunique123', idempotencyKey: 'keyunique1', kind: 'sfx', cost: 1 });
    const afterUniqueDebit = await walletBalance(d1, identity);
    await assert.rejects(reserveJob(d1, identity, { jobId: 'jobunique123', idempotencyKey: 'keyunique2', kind: 'sfx', cost: 2 }));
    assert.equal(await walletBalance(d1, identity), afterUniqueDebit, 'job ID collisions do not leave a debit behind');

    database.prepare("INSERT INTO audio_credit_ledger (user_id, delta, event_type, event_key) VALUES (?, ?, 'admin', ?)")
      .run(identity.userId, 1, 'reserve:jobledger1');
    const beforeLedgerFailure = await walletBalance(d1, identity);
    await assert.rejects(reserveJob(d1, identity, { jobId: 'jobledger1', idempotencyKey: 'keyledger1', kind: 'bgm', cost: 2 }));
    assert.equal(await walletBalance(d1, identity), beforeLedgerFailure, 'ledger trigger failure rolls back the wallet debit');
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM audio_generation_jobs WHERE id = ?').get('jobledger1').n, 0);

    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name);
    assert.deepEqual(tables.sort(), ['audio_credit_ledger', 'audio_generation_jobs', 'audio_quotes', 'audio_wallets', 'd1_migrations', 'sqlite_sequence'].sort().filter(name => tables.includes(name)));
    assert.equal(tables.some(name => ['users', 'credit_ledger'].includes(name)), false);
  } finally {
    database.close();
  }
});

test('parallel Audio Credit reservations cannot overspend the independent wallet', async () => {
  const { database, d1 } = independentAudioDb();
  try {
    const attempts = await Promise.allSettled([
      reserveJob(d1, identity, { jobId: 'jobparallel1', idempotencyKey: 'keyparallel1', kind: 'sfx', cost: 7 }),
      reserveJob(d1, identity, { jobId: 'jobparallel2', idempotencyKey: 'keyparallel2', kind: 'bgm', cost: 7 }),
    ]);
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(attempts.filter(result => result.status === 'rejected' && result.reason.code === 'CREDITS_INSUFFICIENT').length, 1);
    assert.equal(await walletBalance(d1, identity), 3);
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM audio_credit_ledger WHERE event_type = 'reserve'").get().n, 1);
  } finally {
    database.close();
  }
});

test('definitive failure refunds once, success settles the reserve, and unknown provider outcomes stay reserved', async () => {
  const { database, d1 } = independentAudioDb();
  try {
    const failed = await reserveJob(d1, identity, { jobId: 'jobrefund123', idempotencyKey: 'keyrefund123', kind: 'sfx', cost: 3 });
    assert.equal(failed.status, 'reserved');
    assert.equal(await walletBalance(d1, identity), 7);
    assert.deepEqual(await refundJob(d1, identity, { jobId: failed.jobId, failureCode: 'provider_timeout_definitive' }), {
      jobId: failed.jobId, status: 'failed', refunded: 3, reused: false,
    });
    assert.equal(await walletBalance(d1, identity), 10);
    assert.deepEqual(await refundJob(d1, identity, { jobId: failed.jobId }), {
      jobId: failed.jobId, status: 'failed', refunded: 3, reused: true,
    });
    assert.equal(await walletBalance(d1, identity), 10);
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM audio_credit_ledger WHERE job_id = ? AND event_type = 'refund'").get(failed.jobId).n, 1);

    const succeeded = await reserveJob(d1, identity, { jobId: 'jobsuccess123', idempotencyKey: 'keysuccess123', kind: 'bgm', cost: 2 });
    assert.deepEqual(await finalizeJob(d1, identity, { jobId: succeeded.jobId }), {
      jobId: succeeded.jobId, status: 'succeeded', credits: 2, reused: false,
    });
    assert.deepEqual(await finalizeJob(d1, identity, { jobId: succeeded.jobId }), {
      jobId: succeeded.jobId, status: 'succeeded', credits: 2, reused: true,
    });
    assert.equal(await walletBalance(d1, identity), 8, 'success retains the original reservation without a second debit');
    await assert.rejects(refundJob(d1, identity, { jobId: succeeded.jobId }), error => error.code === 'JOB_TERMINAL');

    const uncertain = await reserveJob(d1, identity, { jobId: 'jobunknown123', idempotencyKey: 'keyunknown123', kind: 'bgm', cost: 2 });
    assert.deepEqual(await markJobUnknown(d1, identity, { jobId: uncertain.jobId }), {
      jobId: uncertain.jobId, status: 'unknown', reused: false,
    });
    assert.equal(await walletBalance(d1, identity), 6, 'an ambiguous provider timeout does not release credits');
    await finalizeJob(d1, identity, { jobId: uncertain.jobId });
    assert.equal(await walletBalance(d1, identity), 6, 'reconciliation can confirm success without a second debit');

    const uncertainFailure = await reserveJob(d1, identity, { jobId: 'jobunknownfail', idempotencyKey: 'keyunknownfail', kind: 'bgm', cost: 2 });
    await markJobUnknown(d1, identity, { jobId: uncertainFailure.jobId });
    assert.equal(await walletBalance(d1, identity), 4);
    await refundJob(d1, identity, { jobId: uncertainFailure.jobId, failureCode: 'reconciled_failure' });
    assert.equal(await walletBalance(d1, identity), 6);
  } finally {
    database.close();
  }
});

test('refund ledger failure rolls back status and balance together', async () => {
  const { database, d1 } = independentAudioDb();
  try {
    await reserveJob(d1, identity, { jobId: 'jobrollback1', idempotencyKey: 'keyrollback1', kind: 'sfx', cost: 4 });
    database.prepare("INSERT INTO audio_credit_ledger (user_id, delta, event_type, event_key) VALUES (?, ?, 'admin', ?)")
      .run(identity.userId, 1, 'refund:jobrollback1');
    const balanceBefore = await walletBalance(d1, identity);
    await assert.rejects(refundJob(d1, identity, { jobId: 'jobrollback1' }));
    assert.equal(await walletBalance(d1, identity), balanceBefore);
    assert.equal(database.prepare('SELECT status FROM audio_generation_jobs WHERE id = ?').get('jobrollback1').status, 'reserved');
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM audio_credit_ledger WHERE event_type = 'refund'").get().n, 0);
  } finally {
    database.close();
  }
});
