-- Every question asked on the site. Answered ones make up the public feed.
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  -- lib/similar.ts normalizeQuestion(); used to reuse answers to repeat questions.
  question_norm TEXT NOT NULL,
  -- Set on a follow-up; points at the question it follows up.
  parent_id TEXT REFERENCES questions(id),
  status TEXT NOT NULL CHECK (status IN ('answered', 'out_of_scope')),
  tldr TEXT,
  body TEXT,
  message TEXT,
  -- JSON: [{"marker": "A1", "id": "<article id>"}] for answers, [] otherwise.
  citations TEXT NOT NULL DEFAULT '[]',
  -- JSON: ["<article id>", ...]
  related TEXT NOT NULL DEFAULT '[]',
  -- Knowledge base the answer came from; answers are only reused within one version.
  kb_version TEXT NOT NULL,
  ask_count INTEGER NOT NULL DEFAULT 1,
  -- Set to 1 by hand to take a question off the public feed.
  hidden INTEGER NOT NULL DEFAULT 0,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_cached INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_asked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX questions_reuse ON questions (question_norm, kb_version);
CREATE INDEX questions_recent ON questions (status, hidden, parent_id, last_asked_at);
CREATE INDEX questions_popular ON questions (status, hidden, parent_id, ask_count);
CREATE INDEX questions_parent ON questions (parent_id);
CREATE INDEX questions_created ON questions (created_at);

-- New answers per visitor per day. ip_hash is a salted SHA-256, never the raw IP.
CREATE TABLE rate_limits (
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, day)
);
