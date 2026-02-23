ALTER TABLE decision_runs ADD COLUMN trace_id TEXT;
ALTER TABLE decision_runs ADD COLUMN mode TEXT;

CREATE INDEX IF NOT EXISTS idx_decision_runs_trace_id ON decision_runs(trace_id) WHERE trace_id IS NOT NULL;
