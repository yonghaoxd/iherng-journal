-- Answers that used the asker's own situation ("结合我的处境") are private: neither
-- the situation, the question nor the answer is stored. Only their cost is kept,
-- so the daily budget still counts them.
CREATE TABLE private_usage (
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_cached INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0
);

CREATE INDEX private_usage_created ON private_usage (created_at);
