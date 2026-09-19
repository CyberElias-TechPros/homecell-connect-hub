-- ============================================================================
-- Homecell Connect Hub — initial schema
-- Cloudflare D1 (SQLite)
--
-- Conventions:
--   * ids         TEXT  — application-generated, lexicographically sortable (ULID-ish)
--   * timestamps  TEXT  — ISO-8601 UTC, e.g. 2026-09-18T22:49:58.123Z
--   * booleans    INTEGER 0/1
--   * enums       TEXT with CHECK constraints (SQLite has no native enum)
--   * money       INTEGER — smallest currency unit (kobo), never float
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Organisation hierarchy: organization -> district -> area -> zone -> homecell
-- The exact church structure is CONFIGURABLE: names are data, not code.
-- ---------------------------------------------------------------------------

CREATE TABLE organizations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  timezone    TEXT NOT NULL DEFAULT 'Africa/Lagos',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE districts (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL,
  overseer_id     TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_districts_org ON districts(organization_id);

CREATE TABLE areas (
  id            TEXT PRIMARY KEY,
  district_id   TEXT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL,
  coordinator_id TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE (district_id, code)
);
CREATE INDEX idx_areas_district ON areas(district_id);

CREATE TABLE zones (
  id               TEXT PRIMARY KEY,
  area_id          TEXT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  code             TEXT NOT NULL,
  zonal_leader_id  TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  UNIQUE (area_id, code)
);
CREATE INDEX idx_zones_area ON zones(area_id);

CREATE TABLE homecells (
  id            TEXT PRIMARY KEY,
  zone_id       TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,
  address       TEXT,
  -- Meeting schedule. Kept as data so leaders can change it without a deploy.
  meeting_day   TEXT,                       -- 'sunday' | 'monday' | ... free text
  meeting_time  TEXT,                       -- 'HH:MM' 24h, in `timezone`
  timezone      TEXT NOT NULL DEFAULT 'Africa/Lagos',
  meeting_link  TEXT,                       -- external video provider URL
  meeting_platform TEXT,                    -- 'zoom' | 'google_meet' | 'jitsi' | 'other'
  description   TEXT,
  welcome_message TEXT,
  -- Configurable operational thresholds (see business rules)
  absence_threshold   INTEGER NOT NULL DEFAULT 2,
  auto_approve_members INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  leader_id     TEXT,
  assistant_id  TEXT,
  provider_id   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL CHECK (updated_at >= created_at)
);
CREATE INDEX idx_homecells_zone ON homecells(zone_id);
CREATE INDEX idx_homecells_leader ON homecells(leader_id);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  phone           TEXT UNIQUE,              -- E.164 preferred; primary login id in NG
  email           TEXT UNIQUE,              -- stored lower-cased
  password_hash   TEXT,                     -- PBKDF2-HMAC-SHA256, base64
  password_salt   TEXT,
  password_iterations INTEGER,
  name            TEXT NOT NULL,
  preferred_name  TEXT,
  gender          TEXT CHECK (gender IN ('male','female','other') OR gender IS NULL),
  date_of_birth   TEXT,                     -- 'YYYY-MM-DD' (used only for birthdays)

  role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('member','leader','assistant','provider',
                                    'zonal','area','district','admin','super_admin')),
  homecell_id     TEXT REFERENCES homecells(id) ON DELETE SET NULL,

  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('pending','active','suspended','archived')),

  -- Administrative lifecycle. NOT a spiritual judgement.
  member_status   TEXT NOT NULL DEFAULT 'member'
                    CHECK (member_status IN ('visitor','first_timer','member',
                                             'worker','inactive','transferred','archived')),
  membership_type TEXT CHECK (membership_type IN ('new_convert','old_member') OR membership_type IS NULL),
  is_first_timer  INTEGER NOT NULL DEFAULT 0,

  avatar_url      TEXT,
  address         TEXT,
  city            TEXT,
  country         TEXT,
  occupation      TEXT,
  skills          TEXT,                     -- JSON array of strings
  how_heard       TEXT,
  invited_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,                     -- leader-only; never exposed publicly

  joined_date     TEXT,
  last_login_at   TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX idx_users_homecell ON users(homecell_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_invited_by ON users(invited_by);

-- Sessions. The token itself is NEVER stored; only its SHA-256 hash.
CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  user_agent  TEXT,
  ip          TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Invitation links. Single-use, expiring, revocable.
CREATE TABLE invitations (
  id          TEXT PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE,
  homecell_id TEXT NOT NULL REFERENCES homecells(id) ON DELETE CASCADE,
  created_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('member','leader','assistant','provider',
                                'zonal','area','district','admin','super_admin')),
  note        TEXT,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  used_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  revoked_at  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_invitations_homecell ON invitations(homecell_id);
CREATE INDEX idx_invitations_expires ON invitations(expires_at);

-- ---------------------------------------------------------------------------
-- Attendance
-- One row per member per meeting date. The UNIQUE constraint is the last line
-- of defence against duplicate attendance (double-taps, retries, races).
-- ---------------------------------------------------------------------------

CREATE TABLE attendance_records (
  id            TEXT PRIMARY KEY,
  homecell_id   TEXT NOT NULL REFERENCES homecells(id) ON DELETE CASCADE,
  member_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meeting_date  TEXT NOT NULL,              -- 'YYYY-MM-DD'
  status        TEXT NOT NULL DEFAULT 'present'
                  CHECK (status IN ('present','absent','excused','first_timer','visitor','late')),
  is_first_timer INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  marked_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE (homecell_id, member_id, meeting_date)
);
CREATE INDEX idx_attendance_homecell_date ON attendance_records(homecell_id, meeting_date);
CREATE INDEX idx_attendance_member ON attendance_records(member_id, meeting_date DESC);

-- ---------------------------------------------------------------------------
-- Weekly report (one per homecell per week). Fields mirror the existing UI.
-- ---------------------------------------------------------------------------

CREATE TABLE weekly_reports (
  id              TEXT PRIMARY KEY,
  homecell_id     TEXT NOT NULL REFERENCES homecells(id) ON DELETE CASCADE,
  week_ending     TEXT NOT NULL,            -- 'YYYY-MM-DD' (Sunday)
  meeting_date    TEXT,
  total_attendance INTEGER NOT NULL DEFAULT 0,
  male_count      INTEGER NOT NULL DEFAULT 0,
  female_count    INTEGER NOT NULL DEFAULT 0,
  adult_count     INTEGER NOT NULL DEFAULT 0,
  children_count  INTEGER NOT NULL DEFAULT 0,
  first_timers    INTEGER NOT NULL DEFAULT 0,
  new_converts    INTEGER NOT NULL DEFAULT 0,
  souls_won       INTEGER NOT NULL DEFAULT 0,
  offering        INTEGER,                  -- smallest currency unit
  testimonies     TEXT,
  challenges      TEXT,
  prayer_points   TEXT,
  leader_comments TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved','rejected')),
  submitted_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at    TEXT,
  reviewed_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TEXT,
  review_note     TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE (homecell_id, week_ending)
);
CREATE INDEX idx_reports_homecell ON weekly_reports(homecell_id, week_ending DESC);
CREATE INDEX idx_reports_status ON weekly_reports(status);

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------

CREATE TABLE announcements (
  id           TEXT PRIMARY KEY,
  homecell_id  TEXT REFERENCES homecells(id) ON DELETE CASCADE,
  zone_id      TEXT REFERENCES zones(id) ON DELETE CASCADE,
  scope        TEXT NOT NULL DEFAULT 'homecell'
                 CHECK (scope IN ('homecell','zone','area','district','global')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  category     TEXT,
  priority     TEXT NOT NULL DEFAULT 'normal'
                 CHECK (priority IN ('low','normal','high','urgent')),
  attachment_url TEXT,
  published_at TEXT,
  expires_at   TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_by   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  CHECK (homecell_id IS NOT NULL OR zone_id IS NOT NULL OR scope IN ('area','district','global'))
);
CREATE INDEX idx_announcements_homecell ON announcements(homecell_id, created_at DESC);
CREATE INDEX idx_announcements_zone ON announcements(zone_id, created_at DESC);

CREATE TABLE announcement_reads (
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TEXT NOT NULL,
  PRIMARY KEY (announcement_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Study / training materials
-- ---------------------------------------------------------------------------

CREATE TABLE materials (
  id            TEXT PRIMARY KEY,
  homecell_id   TEXT REFERENCES homecells(id) ON DELETE CASCADE,
  zone_id       TEXT REFERENCES zones(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  material_type TEXT NOT NULL DEFAULT 'document'
                  CHECK (material_type IN ('document','audio','video','link','image','other')),
  url           TEXT,
  file_key      TEXT,                       -- R2 object key when uploaded
  file_size     INTEGER,
  mime_type     TEXT,
  week_ending   TEXT,
  is_published  INTEGER NOT NULL DEFAULT 1,
  published_at  TEXT,
  created_by    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_materials_homecell ON materials(homecell_id, created_at DESC);

CREATE TABLE material_acks (
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ack_type    TEXT NOT NULL DEFAULT 'acknowledged'
                CHECK (ack_type IN ('acknowledged','downloaded')),
  ack_at      TEXT NOT NULL,
  PRIMARY KEY (material_id, user_id, ack_type)
);

-- ---------------------------------------------------------------------------
-- Follow-up CRM
-- ---------------------------------------------------------------------------

CREATE TABLE follow_ups (
  id            TEXT PRIMARY KEY,
  homecell_id   TEXT NOT NULL REFERENCES homecells(id) ON DELETE CASCADE,
  subject_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- who is being followed up
  assigned_to   TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason        TEXT NOT NULL DEFAULT 'first_timer'
                  CHECK (reason IN ('first_timer','new_convert','absentee','visitor',
                                    'prayer_request','care','other')),
  priority      TEXT NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low','normal','high','urgent')),
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','contacted','in_progress','waiting','completed','cancelled')),
  contact_method TEXT CHECK (contact_method IN ('call','whatsapp','sms','email','visit','in_person','other') OR contact_method IS NULL),
  due_date      TEXT,
  completed_at  TEXT,
  outcome       TEXT,
  next_action   TEXT,
  notes         TEXT,
  created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_followups_homecell ON follow_ups(homecell_id, status);
CREATE INDEX idx_followups_assigned ON follow_ups(assigned_to, status);
CREATE INDEX idx_followups_subject ON follow_ups(subject_id);
CREATE INDEX idx_followups_due ON follow_ups(due_date);

-- Append-only interaction log for a follow-up thread.
CREATE TABLE follow_up_notes (
  id           TEXT PRIMARY KEY,
  follow_up_id TEXT NOT NULL REFERENCES follow_ups(id) ON DELETE CASCADE,
  author_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  body         TEXT NOT NULL,
  outcome      TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_followup_notes_parent ON follow_up_notes(follow_up_id, created_at);

-- ---------------------------------------------------------------------------
-- Prayer requests
-- visibility drives server-side access control. 'private' and 'leadership'
-- must never be returned to a non-leader, regardless of what the client asks.
-- ---------------------------------------------------------------------------

CREATE TABLE prayer_requests (
  id           TEXT PRIMARY KEY,
  homecell_id  TEXT NOT NULL REFERENCES homecells(id) ON DELETE CASCADE,
  author_id    TEXT REFERENCES users(id) ON DELETE SET NULL,   -- NULL = anonymous
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  title        TEXT,
  body         TEXT NOT NULL,
  category     TEXT,
  urgency      TEXT NOT NULL DEFAULT 'normal'
                 CHECK (urgency IN ('low','normal','high','urgent')),
  visibility   TEXT NOT NULL DEFAULT 'leadership'
                 CHECK (visibility IN ('private','leadership','cell')),
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','praying','answered','closed')),
  answered_note TEXT,
  answered_at  TEXT,
  assigned_to  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX idx_prayer_homecell ON prayer_requests(homecell_id, created_at DESC);
CREATE INDEX idx_prayer_visibility ON prayer_requests(homecell_id, visibility);
CREATE INDEX idx_prayer_author ON prayer_requests(author_id);

-- ---------------------------------------------------------------------------
-- Notifications (in-app inbox; outbound channels handled by a queue later)
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  severity   TEXT NOT NULL DEFAULT 'info'
               CHECK (severity IN ('info','success','warning','error')),
  read_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- ---------------------------------------------------------------------------
-- Consent + audit + configuration
-- ---------------------------------------------------------------------------

CREATE TABLE consent_records (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,               -- 'data_processing' | 'whatsapp' | 'sms' | 'marketing'
  granted     INTEGER NOT NULL,
  policy_version TEXT,
  recorded_at TEXT NOT NULL,
  ip          TEXT,
  UNIQUE (user_id, consent_type, policy_version)
);
CREATE INDEX idx_consent_user ON consent_records(user_id);

CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                -- 'attendance.update', 'role.change', ...
  entity_type TEXT,
  entity_id   TEXT,
  homecell_id TEXT,
  before_json TEXT,
  after_json  TEXT,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_homecell ON audit_logs(homecell_id, created_at DESC);

-- Key/value platform configuration so that church-specific policy
-- (report format, thresholds, feature switches) is data, not hardcoded.
CREATE TABLE app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);

-- Simple fixed-window rate limiting (login, registration, OTP).
CREATE TABLE rate_limits (
  bucket       TEXT PRIMARY KEY,            -- e.g. 'login:127.0.0.1'
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);
