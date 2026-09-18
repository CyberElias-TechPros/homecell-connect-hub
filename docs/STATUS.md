# Implementation status

**Last updated:** 2026-09-18

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
| Database | D1 (SQLite). Schema applied: **20 tables, 56 DDL statements** |
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

## ⚠️ Prototype — still renders mock data

These screens are **built UI backed by `src/data/mockData.ts` and
`localStorage`**, not by the API. They look finished but are not real. They are
the priority for the next phase.

| Screen / context | Still mock | What it needs |
|---|---|---|
| `AttendanceContext` | ✅ mock | Wire to `GET/POST /api/attendance` |
| `FollowUpsContext` | ✅ mock | Wire to `/api/followups` |
| `ReportsContext` | ✅ mock | Wire to `/api/reports` |
| `AnnouncementsContext` | ✅ mock | Wire to `/api/announcements` |
| `MaterialsContext` | ✅ mock | Wire to `/api/materials` |
| Dashboards (Leader/Zonal/Area/District/Admin/Provider) | ✅ mock | Derive from the above |

**Why this is not simply "swap the data source":** the existing view models are
richer than the current API. For example the UI `Announcement` expects
`urgency`, `target`, `channels`, `status` and `deliveryStats`; `Material`
expects `type`/`format`/`targetAudience`; `FollowUp` expects
`assignedByName`, `followUpHistory` and a different status vocabulary. Wiring
them faithfully means either extending the API schema or simplifying the
components — a deliberate decision, not a mechanical one. Only the `Member`
adapter is currently exact.

---

## ❌ Not started

- Prayer request and testimony screens (API exists at `/api/prayer`; no UI yet)
- Testimony submission and moderation workflow
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

```bash
# Worker boots with all bindings
cd worker && npx wrangler dev --port 8787 --ip 0.0.0.0 --local

# Apply schema to local D1
npx wrangler d1 migrations apply homecell-db --local
# -> 56 commands executed successfully

# Constraint integrity (all three must fail)
npx wrangler d1 execute homecell-db --local --command "<duplicate attendance INSERT>"
npx wrangler d1 execute homecell-db --local --command "<invalid role INSERT>"
npx wrangler d1 execute homecell-db --local --command "<orphan FK INSERT>"

# Frontend
npx tsc --noEmit -p tsconfig.app.json   # 0 errors
npx vitest run                          # 16 passed
npm run build                           # 6 chunks, no size warning

# Journey through the browser-facing origin (Vite proxy on :8080)
curl -X POST localhost:8080/api/auth/register ...
curl -b jar -X GET localhost:8080/api/auth/me
curl -b jar -X POST localhost:8080/api/auth/logout
```

---

## Honest summary

The **foundation is real**: a genuine multi-user system with server-side
authentication, a real relational database with enforced integrity, real
authorization, and a public join flow that a stranger can actually use.

The **operational screens are not yet on that foundation** — they still show the
original prototype's mock data. Wiring them is the next phase, and the adapter
layer in `src/lib/adapters.ts` is where that work begins.
