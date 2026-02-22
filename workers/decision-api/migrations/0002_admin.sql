CREATE TABLE IF NOT EXISTS usage_ledger (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  run_id TEXT NOT NULL,
  customer_ref TEXT NOT NULL,
  price_tier TEXT NOT NULL,
  unit_price_usd REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  FOREIGN KEY(run_id) REFERENCES decision_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_created_at ON usage_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_run_id ON usage_ledger(run_id);

CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO system_state (key, value, updated_at)
VALUES ('active_policy_version', 'v1', datetime('now'));

INSERT OR IGNORE INTO system_state (key, value, updated_at)
VALUES ('active_engine_version', 'v0.1.0', datetime('now'));
