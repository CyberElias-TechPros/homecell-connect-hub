-- ---------------------------------------------------------------------------
-- Record the author's public-sharing consent on the testimony itself.
--
-- `consent_records` holds the current consent *state* for a user and type, and
-- is therefore unique per (user_id, consent_type, policy_version). That makes
-- it unsuitable as the authority for an individual testimony: a member who
-- writes a second testimony would either collide with their own earlier record
-- or overwrite the consent that the first one is still awaiting.
--
-- The consent that governs whether one specific testimony may be published
-- publicly belongs to that testimony, so it is stored here. `consent_records`
-- continues to hold the auditable, account-level record.
--
-- `shared_publicly` remains the publish flag and is still only set at approval,
-- preserving the guard `shared_publicly = 0 OR status = 'approved'`.
-- ---------------------------------------------------------------------------

ALTER TABLE testimonies ADD COLUMN consent_public INTEGER NOT NULL DEFAULT 0;

-- A testimony cannot be marked publicly shared unless its author consented.
-- This is enforced by the database rather than by application code alone.
CREATE TRIGGER testimonies_public_requires_consent
BEFORE UPDATE OF shared_publicly ON testimonies
FOR EACH ROW
WHEN NEW.shared_publicly = 1 AND NEW.consent_public = 0
BEGIN
  SELECT RAISE(ABORT, 'shared_publicly requires the author''s consent');
END;

-- And the same on insert, so a future code path cannot bypass it.
CREATE TRIGGER testimonies_public_requires_consent_insert
BEFORE INSERT ON testimonies
FOR EACH ROW
WHEN NEW.shared_publicly = 1 AND NEW.consent_public = 0
BEGIN
  SELECT RAISE(ABORT, 'shared_publicly requires the author''s consent');
END;
