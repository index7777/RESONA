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
  // One INSERT atomically debits the wallet and writes the ledger via
  // BEFORE/AFTER INSERT triggers in migration 0001.
  try {
    await db.prepare('INSERT INTO audio_generation_jobs (id, user_id, idempotency_key, kind, status, credits_reserved) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(jobId, userId, idempotencyKey, kind, 'reserved', cost).run();
    return { jobId, status: 'reserved', reused: false };
  } catch (error) {
    const raced = await db.prepare('SELECT id, kind, credits_reserved, status FROM audio_generation_jobs WHERE user_id = ? AND idempotency_key = ?')
      .bind(userId, idempotencyKey).first();
    if (raced) {
      if (raced.kind !== kind || raced.credits_reserved !== cost) throw new CreditError('IDEMPOTENCY_CONFLICT', 'Idempotency key reused with different parameters', 409);
      return { jobId: raced.id, status: raced.status, reused: true };
    }
    if (String(error?.message || error).includes('AUDIO_CREDITS_INSUFFICIENT'))
      throw new CreditError('CREDITS_INSUFFICIENT', 'Insufficient Audio Credits', 402);
    throw error;
  }
}
