-- The public feed groups questions that mean the same thing, shows how else they were
-- asked, and lets readers mark the ones that helped them.

-- Questions that mean the same thing share a group: the id of the first one asked.
-- NULL means the question is its own group.
ALTER TABLE questions ADD COLUMN group_id TEXT;
-- Readers who marked this question as helpful (one per visitor, see votes).
ALTER TABLE questions ADD COLUMN votes INTEGER NOT NULL DEFAULT 0;
-- The question's meaning as a Workers AI embedding (bge-m3), int8-quantised and
-- base64-encoded; used only to find its group.
ALTER TABLE questions ADD COLUMN embedding TEXT;

CREATE INDEX questions_group ON questions (group_id);

-- Each time a public question reused an earlier answer: the asker's own wording.
CREATE TABLE question_asks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL REFERENCES questions(id),
  question TEXT NOT NULL,
  asked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX question_asks_question ON question_asks (question_id, asked_at);

-- One helpful vote per visitor per question. voter_hash is a salted SHA-256 of the IP.
CREATE TABLE votes (
  question_id TEXT NOT NULL REFERENCES questions(id),
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (question_id, voter_hash)
);
