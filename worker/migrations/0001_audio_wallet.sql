-- RESONA-only D1. NEVER apply to the RES image-credit database.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS audio_wallets (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS audio_generation_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES audio_wallets(user_id),
  idempotency_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('sfx', 'bgm')),
  status TEXT NOT NULL CHECK (status IN ('reserved','queued','running','succeeded','failed','refunded','unknown')),
  credits_reserved INTEGER NOT NULL CHECK (credits_reserved > 0),
  provider_job_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS audio_jobs_owner_created ON audio_generation_jobs(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS audio_credit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES audio_wallets(user_id),
  job_id TEXT REFERENCES audio_generation_jobs(id),
  delta INTEGER NOT NULL CHECK (delta != 0),
  event_type TEXT NOT NULL CHECK (event_type IN ('grant','reserve','refund','admin')),
  event_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS audio_ledger_owner_created ON audio_credit_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS audio_ledger_job_event ON audio_credit_ledger(job_id, event_type) WHERE job_id IS NOT NULL;
