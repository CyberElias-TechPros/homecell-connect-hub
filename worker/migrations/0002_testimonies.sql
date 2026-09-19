-- ============================================================================
-- Testimonies with a moderation workflow.
--
-- A testimony is only visible to the wider cell once a leader has approved it.
-- Publishing publicly requires separate, explicit consent from the author.
-- ============================================================================

CREATE TABLE testimonies (
  id              TEXT PRIMARY KEY,
  homecell_id     TEXT NOT NULL REFERENCES homecells(id) ON DELETE CASCADE,
  author_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  -- When anonymous, author_id is retained for accountability but never
  -- exposed through the API.
  is_anonymous    INTEGER NOT NULL DEFAULT 0,

  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  category        TEXT,

  -- Who it was written for.
  visibility      TEXT NOT NULL DEFAULT 'cell'
                    CHECK (visibility IN ('leadership','cell','public')),

  -- Moderation state.
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  -- Extra consent required before anything appears outside the cell.
  shared_publicly INTEGER NOT NULL DEFAULT 0,

  reviewed_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TEXT,
  review_note     TEXT,
  published_at    TEXT,

  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,

  -- A public testimony must have been approved AND consented to.
  CHECK (shared_publicly = 0 OR status = 'approved')
);

CREATE INDEX idx_testimonies_homecell ON testimonies(homecell_id, created_at DESC);
CREATE INDEX idx_testimonies_status ON testimonies(homecell_id, status);
CREATE INDEX idx_testimonies_author ON testimonies(author_id);
