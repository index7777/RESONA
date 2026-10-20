/**
 * RESONA D1 credit operations. The caller MUST supply a server-verified RES
 * identity. No remote audio provider should be invoked before reserveJob succeeds.
 *
 * D1 batch statements are executed as a transaction. The conditional UPDATE
 * guard prevents a negative wallet under concurrent reservations; an INSERT
 * SELECT dependent on the guard ensures that insufficient balance cannot
 * create a job. We deliberately throw if the guard does not update a row.
 */
import { requireVerifiedIdentity } from './identity.mjs';

export class CreditError extends Error {
  constructor(code, message, status = 400) {
    super(message); this.name = 'CreditError'; this.code = code; this.status = status;
  }
}
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(value);
export async function ensureWallet(db, verifiedIdentity) {
  const { userId } = requireVerifiedIdentity(verifiedIdentity);
  await db.prepare('INSERT OR IGNORE INTO audio_wallets (user_id) VALUES (?)').bind(userId).run();
  return userId;
}
export async function walletBalance(db, verifiedIdentity) {
  const userId = await ensureWallet(db, verifiedIdentity);
  const row = await db.prepare('SELECT balance FROM audio_wallets WHERE user_id = ?').bind(userId).first();
  return row?.balance ?? 0;
}
/**
 * Reserve credits and create job. For the initial prototype, the DB batch is
 * used only for a transactionally consistent reserve. Caller supplies a unique
 * server-generated jobId and a stable client idempotency key. No providers yet.
 */
export async function reserveJob(db, verifiedIdentity, { jobId, idempotencyKey, kind, cost }) {
  const userId = await ensureWallet(db, verifiedIdentity);
  if (!validId(jobId) || !validId(idempotencyKey) || !['sfx','bgm'].includes(kind) ||
      !Number.isSafeInteger(cost) || cost <= 0 || cost > 100000) {
    throw new CreditError('INVALID_RESERVATION', 'Invalid generation reservation');
  }
  const existing = await db.prepare('SELECT id, kind, credits_reserved, status FROM audio_generation_jobs WHERE user_id = ? AND idempotency_key = ?').bind(userId, idempotencyKey).first();
  if (existing) {
    if (existing.kind !== kind || existing.credits_reserved !== cost) throw new CreditError('IDEMPOTENCY_CONFLICT', 'Idempotency key reused with different parameters', 409);
    return { jobId: existing.id, status: existing.status, reused: true };
  }
  // The first statement must not silently fail: use a conditional INSERT
  // of a job based on the wallet's balance, followed by a guarded UPDATE.
  // A failed/duplicate job insert aborts the batch and rolls back the debit.
  const results = await db.batch([
    db.prepare(`INSERT INTO audio_generation_jobs (id, user_id, idempotency_key, kind, status, credits_reserved)
      SELECT ?, ?, ?, ?, 'reserved', ? WHERE EXISTS
      (SELECT 1 FROM audio_wallets WHERE user_id = ? AND balance >= ?)`)
      .bind(jobId, userId, idempotencyKey, kind, cost, userId, cost),
    db.prepare(`UPDATE audio_wallets SET balance = balance - ?, updated_at = unixepoch()
      WHERE user_id = ? AND balance >= ? AND EXISTS
      (SELECT 1 FROM audio_generation_jobs WHERE id = ? AND user_id = ?)`)
      .bind(cost, userId, cost, jobId, userId),
    db.prepare(`INSERT INTO audio_credit_ledger (user_id, job_id, delta, event_type, event_key)
      SELECT ?, ?, ?, 'reserve', ? WHERE EXISTS
      (SELECT 1 FROM audio_generation_jobs WHERE id = ? AND user_id = ?)`)
      .bind(userId, jobId, -cost, 'reserve:' + jobId, jobId, userId),
  ]);
  if (results[0].meta?.changes !== 1 || results[1].meta?.changes !== 1 || results[2].meta?.changes !== 1) {
    // D1 batch has already committed if no SQL error. This case must be
    // treated as an invariant violation, not success; see Phase 2 TODO.
    throw new CreditError('RESERVATION_NOT_COMMITTED', 'Reservation not committed', 409);
  }
  return { jobId, status: 'reserved', reused: false };
}
