-- Quotes are server-created and single-use. No client-supplied user IDs or prices.
ALTER TABLE audio_generation_jobs ADD COLUMN request_hash TEXT;

CREATE TABLE IF NOT EXISTS audio_quotes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES audio_wallets(user_id),
  kind TEXT NOT NULL CHECK (kind IN ('sfx','bgm')),
  prompt_hash TEXT NOT NULL,
  duration_seconds REAL NOT NULL CHECK (duration_seconds >= 0.5 AND duration_seconds <= 380),
  variants INTEGER NOT NULL CHECK (variants IN (1,2)),
  credits_total INTEGER NOT NULL CHECK (credits_total > 0),
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','consumed','expired')),
  consumed_by_job_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS audio_quotes_owner_expiry ON audio_quotes(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS audio_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES audio_wallets(user_id),
  job_id TEXT NOT NULL REFERENCES audio_generation_jobs(id),
  variant INTEGER NOT NULL CHECK (variant IN (1,2)),
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('audio/mpeg','audio/wav')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  duration_seconds REAL NOT NULL CHECK (duration_seconds > 0),
  provider TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (job_id, variant)
);
CREATE INDEX IF NOT EXISTS audio_assets_owner_created ON audio_assets(user_id, created_at DESC);
