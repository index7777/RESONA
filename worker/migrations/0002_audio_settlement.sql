-- Settlement and definitive-failure refunds for RESONA Audio D1 only.
ALTER TABLE audio_generation_jobs ADD COLUMN failure_code TEXT;

CREATE TRIGGER IF NOT EXISTS audio_job_status_transition_guard
BEFORE UPDATE OF status ON audio_generation_jobs
WHEN NEW.status <> OLD.status AND NOT (
  (OLD.status = 'reserved' AND NEW.status IN ('queued','running','succeeded','failed','unknown')) OR
  (OLD.status = 'queued' AND NEW.status IN ('running','succeeded','failed','unknown')) OR
  (OLD.status = 'running' AND NEW.status IN ('succeeded','failed','unknown')) OR
  (OLD.status = 'unknown' AND NEW.status IN ('succeeded','failed'))
)
BEGIN
  SELECT RAISE(ABORT, 'AUDIO_JOB_INVALID_TRANSITION');
END;

-- A definitive failure atomically returns the reserved amount and appends one
-- refund ledger entry. Any failure in either write rolls the status update back.
CREATE TRIGGER IF NOT EXISTS audio_job_refund_apply
AFTER UPDATE OF status ON audio_generation_jobs
WHEN NEW.status = 'failed' AND OLD.status IN ('reserved','queued','running','unknown')
BEGIN
  UPDATE audio_wallets SET balance = balance + NEW.credits_reserved,
    updated_at = unixepoch() WHERE user_id = NEW.user_id;
  INSERT INTO audio_credit_ledger(user_id, job_id, delta, event_type, event_key)
  VALUES (NEW.user_id, NEW.id, NEW.credits_reserved, 'refund', 'refund:' || NEW.id);
END;
