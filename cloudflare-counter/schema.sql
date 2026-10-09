CREATE TABLE IF NOT EXISTS article_views (
  slug TEXT PRIMARY KEY NOT NULL,
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0)
);

INSERT OR IGNORE INTO article_views (slug, views) VALUES
  ('ai-supported-multimodal-russian-language-learning', 0),
  ('role-of-context-russian-verbal-aspect', 0),
  ('challenges-russian-technical-military-terminology', 0),
  ('fate-family-human-values-don-stories', 0);
