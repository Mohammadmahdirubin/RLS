-- Run once in the rls-manuscripts D1 database.
-- Adds editorial note and immutable status/note history for admin operations.
ALTER TABLE manuscripts ADD COLUMN editor_note TEXT;
CREATE TABLE IF NOT EXISTS manuscript_admin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manuscript_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  editor_note TEXT,
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id)
);
CREATE INDEX IF NOT EXISTS idx_manuscript_admin_history_id ON manuscript_admin_history(manuscript_id, changed_at);
