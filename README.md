# Homecell Connect Hub

An online cell platform for a Christ Embassy / LoveWorld cell: a public page
that lets people find and join the cell, and a leader-facing application for
running it — members, attendance, follow-up, reports and communication.

> **Read [`docs/STATUS.md`](docs/STATUS.md) first.** It states plainly which
> features are backed by the real database and which are still prototype UI
> showing mock data. Do not treat the screens as uniformly finished.

---

## Architecture

```
Browser ── HTTPS ──► Vite / Vercel (React + TypeScript PWA)
                          │
                          │  /api/*  (same origin — Vite proxies in dev)
                          ▼
                 Cloudflare Worker (Hono)   worker/src/
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
    D1 (SQLite)        KV (CACHE)        R2 (STORAGE)
   worker/migrations   rate limits       uploads
```

- **Frontend** — React 18, TypeScript, Vite, Tailwind, Framer Motion, shadcn/ui.
- **API** — Cloudflare Worker with Hono, Zod validation on every input.
- **Database** — Cloudflare D1, migrated with `wrangler d1 migrations`.
- **Shared authorization** — `shared/permissions.ts` is imported by *both* the
  Worker and the frontend so the two can never disagree about who may do what.
  The Worker is the only authority; the frontend copy just hides what a user
  cannot use.

## Repository layout

```
src/                     React application
  lib/api.ts             typed API client (single point of contact with the API)
  lib/adapters.ts        API row → view model translation
  lib/datetime.ts        time zone + meeting-time logic (unit tested)
  contexts/              application state
  pages/                 routes
shared/permissions.ts    authorization model shared by frontend and Worker
worker/                  Cloudflare Worker
  src/index.ts           app entry, middleware, route mounting
  src/auth.ts            sessions, permissions, OTP storage
  src/lib/               crypto, validation, scoping, rate limiting, audit
  src/routes/            auth, public, members, attendance, reports,
                         announcements, materials, followups, prayer,
                         notifications, hierarchy
  migrations/            D1 schema
docs/STATUS.md           what is real vs. prototype
docs/DEPLOYMENT.md       Cloudflare + Vercel deployment
```

## Running locally

Requires Node 20+.

```bash
npm install

# 1. Apply the database schema
cd worker
npx wrangler d1 migrations apply homecell-db --local

# 2. Create a cell and two sign-in accounts
cd .. && node worker/scripts/seed.mjs

# 3. Start the API (leave running) — http://127.0.0.1:8787
cd worker && npx wrangler dev --port 8787 --ip 0.0.0.0 --local

# 4. In a second terminal, start the frontend — http://localhost:8080
cd .. && npm run dev
```

The frontend proxies `/api` and `/health` to the Worker, so the browser only
ever talks to one origin. That keeps cookies and CORS simple and means the same
code works when the two are deployed separately.

### Seed a working cell

The app needs at least one cell before anyone can join. One command creates an
example organisation, a cell and two sign-in accounts:

```bash
node worker/scripts/seed.mjs            # local database
node worker/scripts/seed.mjs --reset    # wipe first, then seed
node worker/scripts/seed.mjs --remote   # a deployed database
```

It prints the accounts it created. Locally these are:

| Role | Phone | Password |
|---|---|---|
| Cell leader | `+2348051112222` | `GraceLife2026!` |
| Member | `+2348123456789` | `Member2026!` |

Override them with `SEED_LEADER_PASSWORD` and `SEED_MEMBER_PASSWORD` before
running against anything real. Passwords are hashed with the same PBKDF2
parameters the Worker uses, so these accounts log in normally.

Everything the seed creates is an **example**, not church policy — the district/
area/zone names, the meeting time and the welcome message are ordinary data you
edit from the app.

Then visit `http://localhost:8080`. The landing page loads cell `HC1`, and a
visitor can read about the cell and ask to join.

### Accounts and roles

Members register themselves from the public join page. A leader can also add
someone directly, mark attendance on their behalf, and invite people with a
single-use link (More → Invite people).

Roles are **assigned by the server**. A user cannot pick their own role, and the
previous build's role dropdown is gone. To promote someone:

```bash
cd worker
npx wrangler d1 execute homecell-db --local --command \
  "UPDATE users SET role='leader', status='active' WHERE phone='+234XXXXXXXXXX';"
```

This requires database access on purpose: role changes are a privileged
operation with no self-service path.

## Tests

```bash
npm run test                              # vitest — 30 tests
npx tsc --noEmit -p tsconfig.app.json     # 0 errors
cd worker && npx tsc --noEmit             # 0 errors
npm run build
```

Two kinds of test live here:

- **Unit** — 15 tests for `src/lib/datetime.ts`, covering DST transitions, week
  roll-forward and invalid input (it returns `null` rather than guessing a
  meeting time).
- **End-to-end** — `src/test/journeys.e2e.test.tsx`. These render the real page
  components inside the same provider stack `App.tsx` mounts and hit a running
  Worker. They are not mocked: a request composed in the UI is re-read from D1 to
  prove it persisted.

The end-to-end suite needs both servers running, and a freshly seeded database:

```bash
node worker/scripts/seed.mjs --reset   # terminal 1 (then start the servers)
npx vitest run src/test/journeys.e2e.test.tsx
```

If the API is not reachable the suite **skips loudly** — it never passes against
nothing. It talks to `TEST_API_BASE` (default `http://127.0.0.1:8080`).

## Security notes

- Passwords: PBKDF2-HMAC-SHA256, 100,000 iterations. **On the Workers free plan,
  lower `PBKDF2_ITERATIONS` in `worker/src/lib/crypto.ts` to 25,000** — the free
  plan's 10 ms CPU budget cannot cover 100k iterations. Stored hashes keep
  verifying because the iteration count is recorded per row.
- Sessions: only the SHA-256 digest of a session token is stored.
- Privacy: prayer requests are filtered by `visibility` in SQL. A private
  request is never returned to a non-author, whatever the client asks for.
- Pastoral notes (`users.notes`) are only selected for leader-level roles.
- Every protected route calls `requirePermission`; row access additionally goes
  through `assertHomecellAccess`.
- Rate limiting covers registration, login, OTP and password change.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Licensing and content

This is not an official LoveWorld / Christ Embassy product and uses no
ministry branding. Ministry content must not be re-hosted without
authorisation — the materials module stores links, not copied content.
