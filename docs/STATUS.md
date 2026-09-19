# Implementation status

**Last updated:** 2026-09-19

This document exists to keep the project honest. It separates what has been
**built and verified** from what is **still a prototype**, so nobody mistakes a
finished-looking screen for a finished feature.

---

## ✅ Built, wired to a real database, and verified

Everything below was exercised end-to-end against a running Cloudflare Worker
and a real D1 database. The commands used are listed in
[Verification performed](#verification-performed).

### Backend (Cloudflare Worker + D1)

| Area | Detail |
|---|---|
| Runtime | Cloudflare Worker (Hono) with `workerd` via `wrangler dev` — confirmed running |
| Database | D1 (SQLite). Schema applied: **22 tables** across 4 migrations (`0001_init`, `0002_testimonies`, `0003_public_join`, `0004_testimony_consent`) |
| Real SQL | DDL, bound INSERTs, SELECTs all verified returning real persisted rows |
| Constraint integrity | Duplicate attendance → `UNIQUE constraint failed`; invalid role → `CHECK constraint failed`; orphan reference → `FOREIGN KEY constraint failed` |
| Password storage | PBKDF2-HMAC-SHA256, 100,000 iterations, 16-byte random salt, per-row iteration count. Verified the stored value is a hash, never the password |
| Sessions | Opaque 32-byte token; only its SHA-256 digest is stored. HttpOnly + SameSite=Lax cookie, `Secure` when served over HTTPS, 30-day TTL |
| Account enumeration | Wrong password and unknown account return an **identical** message; `verifyPassword` always runs so response timing does not leak existence |
| Rate limiting | D1 fixed window on register, login, login-failure, OTP request/verify, password change |
| Authorization | Permission matrix shared by Worker and UI; server is the sole authority |
| Row-level scoping | `getAccessibleHomecellIds()` resolves the hierarchy slice per role; filtering happens in SQL |
| Audit log | Sensitive actions recorded (register, login, role change, attendance, report review, prayer visibility) |
| Consent | Explicit `consent_records` rows for data processing and WhatsApp |

### End-to-end journeys verified

1. **Visitor discovers a cell** — `GET /api/public/cell/HC1` returns name, meeting
   day/time, timezone, leader name, welcome message, member count. ✅
2. **Visitor registers** — `POST /api/auth/register` → 201, session cookie issued. ✅
3. **Consent recorded** — `data_processing` and `whatsapp` rows written. ✅
4. **First-timer automation** — registration automatically created a
   `follow_ups` row with `reason=first_timer`, `priority=high`, due in 2 days. ✅
5. **Session works** — `GET /api/auth/me` returns the user, their cell and their
   permission list. ✅
6. **Logout** — session destroyed; subsequent `/api/auth/me` returns 401. ✅
7. **Duplicate registration** — rejected with 409 CONFLICT. ✅
8. **Leader views roster** — 4 real members from D1, `includesPrivateNotes: true`
   for leader role only. ✅
9. **Follow-up queue** — 3 real follow-ups with correct summary counts. ✅

### Authorization boundaries verified

| Attempt | Result |
|---|---|
| Member reads another member's profile | **403** — "You can only view your own profile." |
| Member reads another member's timeline | **403** |
| Member marks attendance | **403** |
| Member creates an announcement | **403** |
| Anonymous requests the members list | **401** |
| Anonymous reads the public cell page | **200** |
| Pending (not yet approved) user signs in | **allowed** — sees own status |
| Pending user tries to act | **403** — "still awaiting approval" |
| Pending user reads the prayer board | **403** |

### Frontend

| Area | Detail |
|---|---|
| Real authentication | `AuthContext` rewritten against the API. **Roles are assigned by the server** — the previous build let a user pick their own role from a list |
| Public landing page | New `/` and `/cell/:code`. Hero, live meeting countdown, what-happens-here, join CTA |
| Join flow | New `/join` and `/join/:code`. Field-level validation, required consent, honest success/pending states |
| Login | New `/login`. Password and phone-code modes |
| Member roster | Wired to `GET /api/members` via a real adapter layer |
| **Bug fixed** | `MemberProvider` was never mounted in `App.tsx`, so every `useMembers()` call threw and the entire Members section crashed. Now mounted |
| Timezone engine | `src/lib/datetime.ts` — wall-clock ↔ UTC conversion, next weekly meeting, countdown. **15 unit tests** covering DST boundaries, roll-forward and invalid input |
| Type safety | `tsc --noEmit` passes with **zero errors** (was 2) |
| Bundle | Split into 6 chunks. Entry chunk 1,186 KB → **462 KB** (gzip 339 KB → **124 KB**) |
| Tests | 16 passing |

---

## ✅ Every screen is now on live data

`src/data/mockData.ts` has been **deleted**. Nothing in `src/` imports mock
data any more — verify with `grep -rn "from '@/data/mockData'" src/`, which
returns nothing.

| Area | Status |
|---|---|
| `AttendanceContext` | ✅ Real API. Draft-based marking; a failed save keeps the leader's sheet rather than discarding it |
| `FollowUpsContext` | ✅ Real API. `deleteFollowUp` = `status: 'cancelled'` (no hard delete, so pastoral history survives) |
| `ReportsContext` | ✅ Real API. Draft pre-fills from real attendance plus open prayer/follow-up counts |
| `AnnouncementsContext` | ✅ Real API, server-side read state |
| `MaterialsContext` | ✅ Real API. Stores **links**, never copies ministry content |
| `PrayerContext` | ✅ Real API. Visibility enforced in SQL |
| `TestimoniesContext` | ✅ Real API. Moderation enforced server-side and by database constraint |
| Leader dashboard | ✅ Real attendance, follow-ups, announcements, prayer and member counts |
| Provider dashboard | ✅ Renders the real cell view (a provider is a cell worker, `ROLE_SCOPE.provider === 'homecell'`) |
| Zonal / Area / District / Admin | ✅ One real oversight dashboard on `GET /api/hierarchy/overview`, scoped per role. Says so plainly when the scope is empty |

**What replaced the fabricated dashboards.** The four oversight dashboards
previously showed invented figures (`totalHomecells: 45`, `totalAttendance: 285`,
per-cell attendance percentages) and three of them had buttons that only called
`console.log`. They now render one `OversightDashboard` fed by a real aggregate
endpoint that counts rows in the database, scoped to the cells the signed-in
user can actually reach.

### The one deliberate exception

`AnnouncementsContext.updateAnnouncement` / `scheduleAnnouncement` and
`MaterialsContext.updateMaterial` / `deleteMaterial` / `scheduleMaterial`
**throw explicit "not supported yet" errors**. The API has no such operations,
and the alternative — an optimistic no-op that reports success — is exactly the
pretend-behaviour this project forbids.

---

## ❌ Not started

- Video meetings: **not built, by design.** Cells link out to Zoom / Google Meet
  / Jitsi. No custom WebRTC
- Payments: **not built, by design.** The platform links only to official church
  giving channels
- Push / SMS / WhatsApp *delivery* of notifications. `MESSAGING_DRIVER=log`
- Message threads between members (not built)
- Offline write queue — `saveOffline`/`getPendingChanges` are honest no-ops
- Push / SMS / WhatsApp delivery. `MESSAGING_DRIVER=log`; OTP codes are written
  to the Worker log. The UI **says so** rather than claiming a message was sent
- File uploads to R2 (binding is configured, no upload endpoint yet)
- Scheduled jobs (cron handler exists; no triggers configured)
- Multilingual copy (English only)
- Leader handover / cell transfer
- Safeguarding flows for minors

---

## Verification performed

Everything below was actually run. Commands and their real output.

### Automated

```bash
node worker/scripts/seed.mjs --reset      # clean, known database
npx tsc --noEmit -p tsconfig.app.json     # 0 errors
cd worker && npx tsc --noEmit             # 0 errors
npx vitest run                            # 3 files, 30 tests, all passing
npm run build                             # 6 chunks, entry 487 kB (gzip 129 kB)
```

The 30 tests comprise 15 timezone unit tests, 1 smoke test, and **14 end-to-end
journeys** (`src/test/journeys.e2e.test.tsx`). The end-to-end suite is not
mocked: it renders the real page components inside the same provider stack
`App.tsx` mounts, every context calls the live API, and a mutation made through
the UI is re-read from the database to prove it persisted. If the backend is not
running the suite **skips loudly** rather than passing against nothing.

### End-to-end journeys verified (through the real UI, to real D1 rows)

| # | Journey | Result |
|---|---|---|
| 1 | Public cell page renders the real cell name, leader and member count | ✅ |
| 2 | Meeting link appears only once the leader opens public joining | ✅ |
| 3 | Meeting link and passcode are withheld from an anonymous visitor when closed | ✅ |
| 4 | Leader sees a member's prayer request, with the author named | ✅ |
| 5 | A `private` prayer request is not returned to another member — DOM and API | ✅ |
| 6 | A member composes a prayer request in the UI and it reaches the database | ✅ |
| 7 | A testimony stays hidden from other members until a leader approves it | ✅ |
| 8 | A public testimony submitted without consent is refused, and nothing is written | ✅ |
| 9 | A public testimony with consent is still gated until approval | ✅ |
| 10 | A member cannot change cell meeting settings | ✅ 403 |
| 11 | A member cannot issue an invitation | ✅ 403 |
| 12 | A member cannot approve their own testimony | ✅ 403, still `pending` in the DB |
| 13 | A member cannot read another cell through the overview endpoint | ✅ scoped to `hc1` |
| 14 | An unauthenticated caller gets 401 on members, prayer, attendance, reports, follow-ups | ✅ |

### Database-level guards proven directly

Run against D1, bypassing the application entirely:

```bash
# 1. A testimony cannot be published before it is approved
npx wrangler d1 execute homecell-db --local --command \
  "UPDATE testimonies SET shared_publicly=1 WHERE status='pending' AND consent_public=1;"
# -> CHECK constraint failed: shared_publicly = 0 OR status = 'approved'

# 2. A testimony cannot be marked publicly shared without the author's consent
npx wrangler d1 execute homecell-db --local --command \
  "UPDATE testimonies SET status='approved', shared_publicly=1 WHERE consent_public=0 LIMIT 1;"
# -> shared_publicly requires the author's consent

# 3. The same guard on INSERT, so a future code path cannot bypass it
# -> shared_publicly requires the author's consent
```

### Invitations and data rights

| Check | Result |
|---|---|
| Leader creates an invitation | ✅ 201, token returned once |
| Raw token is **not** stored — only its SHA-256 digest | ✅ DB shows a different value |
| Invitation resolves on the public route | ✅ cell name + inviter |
| Invitation is single-use | ✅ second use → 410 `INVITE_USED` |
| Invitation list shows it as `used`, attributed to the registrant | ✅ |
| `GET /api/auth/export` returns only the caller's own data | ✅ no other users present |
| Export is delivered as a file download | ✅ `content-disposition: attachment` |
| A non-leader cannot change cell settings | ✅ 403 |

### Bugs found by these tests and fixed

These were found by running the tests, not by reading the code:

1. **Public testimony with consent returned HTTP 500.** Consent was written to
   `shared_publicly` at submission, which breached the table's own publish guard.
   Consent is now stored per testimony in `consent_public`, and `shared_publicly`
   is only set at approval — where it is also checked against that consent.
2. **Public testimony without consent silently became private.** The API accepted
   the request and stored something other than what was asked for. It now
   refuses with a clear validation error.
3. **`consent_records` has a unique key on `(user_id, consent_type,
   policy_version)`**, so a member's second testimony raised a constraint error.
   The account-level record is now upserted; the per-testimony consent lives on
   the testimony.
4. **`sharedPublicly` was returned as `0`/`1`** while every other boolean in the
   API envelope is a real boolean. Now converted at the boundary.
5. **`src/data/mockData.ts` was still imported by six screens** and the four
   oversight dashboards showed invented statistics behind buttons that called
   `console.log`. Removed and replaced with real data.

---

## Honest summary

**The foundation is real and the product now sits on it.** A genuine multi-user
system: server-side authentication with PBKDF2-hashed passwords and hashed
session tokens, a real relational database with integrity enforced by
constraints and triggers, real row-level authorization, and a public join flow a
stranger can use.

**Every screen reads live data.** There is no mock data layer left in the
codebase. Where a screen cannot do something, it says so — it does not simulate
success.

**What has not been done:**

- No real browser was driven. Playwright could not download Chromium in the build
  environment. The end-to-end coverage is real but runs through jsdom against the
  live API, which exercises the components, contexts, adapters, HTTP layer and
  database — it does not exercise paint, layout or touch behaviour. **Treat
  visual and responsive behaviour as unverified until someone opens it.**
- No load, penetration, or accessibility audit has been run. `prefers-reduced-motion`
  is honoured and semantic roles/labels are used, but WCAG AA has not been tested
  with a screen reader or an automated auditor.
- Push/SMS/WhatsApp delivery is not connected; notifications are in-app only
  (`MESSAGING_DRIVER=log`).
- Nothing is deployed. `wrangler.toml` still holds placeholder resource IDs.
- 11 npm advisories remain (5 high, 6 moderate) in development tooling
  (`wrangler`, `miniflare`, `ws`, `vite`, `vitest`). The one **critical** advisory
  (vitest UI arbitrary file read) has been fixed. Clearing the rest requires a
  major `wrangler` upgrade, which is a separate, deliberate change.

**Items needing confirmation from a pastor or zonal leader** — none of the
following is asserted by this software; all of it is configurable data, and the
defaults are placeholders:

- The names and structure of district / area / zone / cell, and the titles used
  for each role
- Whether members may join an online cell directly, or must first be added by a
  leader (currently a per-cell setting, defaulting to **closed**)
- What a weekly report must contain, and who approves it
- Whether a testimony may be shared publicly, and who authorises that
- Any retention period for attendance and pastoral records
- Whether the cell's meeting link may be published publicly (per-cell setting,
  defaulting to **off**)
