-- ---------------------------------------------------------------------------
-- Public joining of an online cell.
--
-- An online cell needs to be able to publish a way for a newcomer to join the
-- meeting without first being added by a leader. Offline cells generally do
-- not, and a meeting link may carry a passcode, so publishing it is a
-- deliberate decision rather than a default.
--
-- `public_join_enabled` is therefore explicit per cell and defaults to 0
-- (closed). A leader turns it on from the cell settings. Nothing is revealed
-- publicly until they do.
-- ---------------------------------------------------------------------------

ALTER TABLE homecells ADD COLUMN public_join_enabled INTEGER NOT NULL DEFAULT 0;

-- Optional passcode or PIN shown alongside the link. Held separately from the
-- link so a leader can rotate one without the other.
ALTER TABLE homecells ADD COLUMN meeting_passcode TEXT;

-- Optional short note shown on the public page, e.g. "muted on entry".
ALTER TABLE homecells ADD COLUMN join_instructions TEXT;
