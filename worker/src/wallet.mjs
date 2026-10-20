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

function validateJobId(jobId) {
  if (!validId(jobId)) throw new CreditError('INVALID_JOB', 'Invalid generation job ID');
  return jobId;
}

async function existingJob(db, userId, jobId) {
  return db.prepare('SELECT id, status, credits_reserved FROM audio_generation_jobs WHERE user_id = ? AND id = ?')
    .bind(userId, jobId).first();
}

/** Finalize an accepted provider result. A success keeps the original reserve. */
export async function finalizeJob(db, verifiedIdentity, { jobId }) {
  const { userId } = requireVerifiedIdentity(verifiedIdentity);
  validateJobId(jobId);
  const updated = await db.prepare(`UPDATE audio_generation_jobs
    SET status = 'succeeded', updated_at = unixepoch()
    WHERE user_id = ? AND id = ? AND status IN ('reserved','queued','running','unknown')
    RETURNING id, status, credits_reserved`).bind(userId, jobId).first();
  if (updated) return { jobId: updated.id, status: updated.status, credits: updated.credits_reserved, reused: false };
  const current = await existingJob(db, userId, jobId);
  if (!current) throw new CreditError('JOB_NOT_FOUND', 'Generation job not found', 404);
  if (current.status === 'succeeded') return { jobId: current.id, status: current.status, credits: current.credits_reserved, reused: true };
  throw new CreditError('JOB_TERMINAL', 'Generation job cannot be finalized from its current state', 409);
}

/**
 * Refund only a definitive failure/cancellation. `unknown` provider outcomes
 * remain reserved until reconciled; the database trigger performs the refund
 * and ledger append atomically and exactly once.
 */
export async function refundJob(db, verifiedIdentity, { jobId, failureCode = 'provider_failed' }) {
  const { userId } = requireVerifiedIdentity(verifiedIdentity);
  validateJobId(jobId);
  if (typeof failureCode !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(failureCode))
    throw new CreditError('INVALID_FAILURE_CODE', 'Invalid failure code');
  const updated = await db.prepare(`UPDATE audio_generation_jobs
    SET status = 'failed', failure_code = ?, updated_at = unixepoch()
    WHERE user_id = ? AND id = ? AND status IN ('reserved','queued','running','unknown')
    RETURNING id, status, credits_reserved`).bind(failureCode, userId, jobId).first();
  if (updated) return { jobId: updated.id, status: updated.status, refunded: updated.credits_reserved, reused: false };
  const current = await existingJob(db, userId, jobId);
  if (!current) throw new CreditError('JOB_NOT_FOUND', 'Generation job not found', 404);
  if (current.status === 'failed') return { jobId: current.id, status: current.status, refunded: current.credits_reserved, reused: true };
  throw new CreditError('JOB_TERMINAL', 'Generation job cannot be refunded from its current state', 409);
}

/** Mark an ambiguous provider outcome without refunding or retrying it. */
export async function markJobUnknown(db, verifiedIdentity, { jobId }) {
  const { userId } = requireVerifiedIdentity(verifiedIdentity);
  validateJobId(jobId);
  const updated = await db.prepare(`UPDATE audio_generation_jobs
    SET status = 'unknown', updated_at = unixepoch()
    WHERE user_id = ? AND id = ? AND status IN ('reserved','queued','running')
    RETURNING id, status`).bind(userId, jobId).first();
  if (updated) return { jobId: updated.id, status: updated.status, reused: false };
  const current = await existingJob(db, userId, jobId);
  if (!current) throw new CreditError('JOB_NOT_FOUND', 'Generation job not found', 404);
  if (current.status === 'unknown') return { jobId: current.id, status: current.status, reused: true };
  throw new CreditError('JOB_TERMINAL', 'Generation job cannot become unknown from its current state', 409);
}
