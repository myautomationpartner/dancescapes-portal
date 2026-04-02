-- Unified Inbox schema for Cloudflare D1
-- Database: dancescapes-inbox

CREATE TABLE IF NOT EXISTS unified_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  blogId          TEXT    NOT NULL,
  conversationId  TEXT    NOT NULL,
  network         TEXT    NOT NULL,
  type            TEXT    NOT NULL DEFAULT 'message',
  userName        TEXT,
  text            TEXT,
  rating          INTEGER,
  timestamp       INTEGER,
  synced_at       INTEGER DEFAULT (unixepoch()),
  UNIQUE(blogId, conversationId)
);

CREATE INDEX IF NOT EXISTS idx_blogId_timestamp
  ON unified_messages(blogId, timestamp DESC);
