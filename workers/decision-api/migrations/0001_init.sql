CREATE TABLE IF NOT EXISTS decision_runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  status TEXT NOT NULL,
  input_canonical_json TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  hash TEXT NOT NULL,
  summary_json TEXT,
  validation_report_json TEXT
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES decision_runs(id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  FOREIGN KEY(run_id) REFERENCES decision_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_decision_runs_created_at ON decision_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_run_id ON artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_run_id ON audit_events(run_id);
