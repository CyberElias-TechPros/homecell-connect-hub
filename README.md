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

# 2. Start the API (leave running) — http://127.0.0.1:8787
npx wrangler dev --port 8787 --ip 0.0.0.0 --local

# 3. In a second terminal, start the frontend — http://localhost:8080
cd ..
npm run dev
```

The frontend proxies `/api` and `/health` to the Worker, so the browser only
ever talks to one origin. That keeps cookies and CORS simple and means the same
code works when the two are deployed separately.

### First run: create a cell

The app needs at least one cell before anyone can join. After starting the
Worker:

```bash
cd worker
npx wrangler d1 execute homecell-db --local --command "
INSERT INTO organizations (id,name,slug,timezone,created_at,updated_at)
  VALUES ('org1','My Ministry','my-ministry','Africa/Lagos',datetime('now'),datetime('now'));
INSERT INTO districts (id,organization_id,name,code,created_at,updated_at)
  VALUES ('d1','org1','District 1','D1',datetime('now'),datetime('now'));
INSERT INTO areas (id,district_id,name,code,created_at,updated_at)
  VALUES ('a1','d1','Area 1','A1',datetime('now'),datetime('now'));
INSERT INTO zones (id,area_id,name,code,created_at,updated_at)
  VALUES ('z1','a1','Zone 1','Z1',datetime('now'),datetime('now'));
INSERT INTO homecells (id,zone_id,name,code,timezone,meeting_day,meeting_time,auto_approve_members,created_at,updated_at)
  VALUES ('hc1','z1','Grace Life Online Cell','HC1','Africa/Lagos','sunday','18:00',1,datetime('now'),datetime('now'));
INSERT INTO app_settings (key,value,updated_at)
  VALUES ('default_homecell_id','hc1',datetime('now'));
"
```

Then visit `http://localhost:8080` — the landing page loads cell `HC1` and a
visitor can register.

To make yourself the leader of that cell, register normally and then promote
yourself directly in the database (role changes require `manage_users`
permission, so this is a deliberate bootstrap step rather than an API call):

```bash
npx wrangler d1 execute homecell-db --local --command \
  "UPDATE users SET role='leader', status='active' WHERE phone='+234XXXXXXXXXX';"
```

## Tests

```bash
npm run test          # vitest
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

The time zone logic in `src/lib/datetime.ts` is covered by 15 unit tests,
including DST transitions, week roll-forward, and behaviour on invalid input
(the function returns `null` rather than guessing a meeting time).

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
