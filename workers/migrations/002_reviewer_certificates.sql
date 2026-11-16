CREATE TABLE IF NOT EXISTS reviewer_certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_code TEXT NOT NULL UNIQUE,
  reviewer_name TEXT NOT NULL,
  review_count INTEGER NOT NULL CHECK (review_count > 0),
  issue_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_reviewer_certificates_code ON reviewer_certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_reviewer_certificates_name ON reviewer_certificates(reviewer_name);