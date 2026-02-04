-- SOFR Tracker D1 Schema
-- Stores Federal Reserve rate data for dashboard visualization

-- SOFR (Secured Overnight Financing Rate) with percentiles
CREATE TABLE IF NOT EXISTS sofr_rates (
  date TEXT PRIMARY KEY,
  rate REAL NOT NULL,
  p1 REAL,
  p25 REAL,
  p75 REAL,
  p99 REAL,
  volume_billions REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- EFFR (Effective Federal Funds Rate) with percentiles
CREATE TABLE IF NOT EXISTS effr_rates (
  date TEXT PRIMARY KEY,
  rate REAL NOT NULL,
  p1 REAL,
  p25 REAL,
  p75 REAL,
  p99 REAL,
  target_low REAL,
  target_high REAL,
  volume_billions REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Policy rates (IORB, Standing Repo Facility, Reverse Repo)
CREATE TABLE IF NOT EXISTS policy_rates (
  date TEXT PRIMARY KEY,
  iorb REAL,
  srf REAL,
  rrp REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- RRP (Reverse Repo) operation details
CREATE TABLE IF NOT EXISTS rrp_operations (
  date TEXT PRIMARY KEY,
  total_accepted_billions REAL,
  participating_counterparties INTEGER,
  mmf_accepted_billions REAL,
  gse_accepted_billions REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for date range queries
CREATE INDEX IF NOT EXISTS idx_sofr_date ON sofr_rates(date);
CREATE INDEX IF NOT EXISTS idx_effr_date ON effr_rates(date);
CREATE INDEX IF NOT EXISTS idx_policy_date ON policy_rates(date);
CREATE INDEX IF NOT EXISTS idx_rrp_date ON rrp_operations(date);

-- Sync metadata for tracking last sync
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
