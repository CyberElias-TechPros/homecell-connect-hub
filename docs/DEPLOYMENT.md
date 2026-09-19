# Deployment

Two pieces deploy independently:

| Piece | Host | Directory |
|---|---|---|
| API | Cloudflare Workers + D1 + KV + R2 | `worker/` |
| Frontend | Vercel (or any static host) | repository root |

You need a Cloudflare account and a Vercel account. Nothing below can be done
for you — the identifiers are specific to your accounts.

---

## 1. Cloudflare: create the resources

```bash
npm install -D wrangler
npx wrangler login
```

Create each resource and **copy the ids it prints**:

```bash
npx wrangler d1 create homecell-db
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create homecell-storage
```

## 2. Put the real ids into `worker/wrangler.toml`

Replace the three placeholders:

```toml
[[d1_databases]]
binding = "DB"
database_name = "homecell-db"
database_id = "<d1 id from step 1>"        # was 00000000-0000-...

[[kv_namespaces]]
binding = "CACHE"
id = "<kv id from step 1>"                 # was 00000000000000000000000000000000

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "homecell-storage"
```

Also set `ALLOWED_ORIGINS` to the exact origin your frontend will be served
from — for example `"https://cell.example.com"`. **Do not use `*`**: the API
uses credentialed cookies, and a wildcard would either be rejected by the
browser or weaken the protection.

```toml
[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://cell.example.com"
MESSAGING_DRIVER = "log"
```

## 3. Apply the schema to the remote database

```bash
cd worker
npx wrangler d1 migrations apply homecell-db --remote
```

## 4. Bootstrap your cell

The application needs one cell before anyone can join. Run the same inserts as
in the README's "First run" section, but with `--remote` instead of `--local`.

## 5. Deploy the Worker

```bash
cd worker
npx wrangler deploy
```

Note the resulting URL, e.g. `https://homecell-api.<your-subdomain>.workers.dev`.
Check it: `curl https://homecell-api.<...>.workers.dev/health`.

## 6. Deploy the frontend

In Vercel, import this repository and set:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_API_URL=https://homecell-api.<your-subdomain>.workers.dev` |

`VITE_API_URL` is baked in at build time. If the API is on a different origin
from the frontend, the session cookie needs `SameSite=None; Secure`, which
requires HTTPS on both sides — in that case also change `sameSite: 'Lax'` to
`'None'` in `worker/src/lib/http.ts` (`sessionCookie`). The simpler option is
to serve the API on the same origin via a Vercel rewrite:

```json
{ "rewrites": [{ "source": "/api/:path*", "destination": "https://homecell-api.<...>.workers.dev/api/:path*" }] }
```

With a same-origin rewrite you can leave `VITE_API_URL` unset and keep
`SameSite=Lax`.

## 7. Post-deploy smoke test

```bash
# API is alive
curl https://<api-host>/health

# Public cell page loads
curl https://<api-host>/api/public/cell/HC1

# Register a test account, confirming the session cookie is issued
curl -i -X POST https://<api-host>/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Test User","phone":"08000000000","password":"testpass123","consentDataProcessing":true}'
# expect: HTTP 201 and a Set-Cookie: hcc_session=...; HttpOnly; SameSite=Lax; Secure
```

Then in a browser: load the landing page → join → sign in → confirm the member
roster loads.

---

## Optional integrations

These are **not configured** and the application is designed to work without
them. It reports the truth rather than pretending to send messages.

### SMS (OTP)

Set a provider and key:

```bash
cd worker
npx wrangler secret put TERMII_API_KEY
```

Then set `MESSAGING_DRIVER = "termii"` in `[vars]`. Until a provider is
configured, `/api/auth/otp/request` returns `messagingConfigured: false` and
**writes the code to the Worker log only**; the login screen states this to the
user instead of implying a message was sent. Wiring the actual send call is
outstanding work — the adapter currently returns `delivered: false`.

### Email

`RESEND_API_KEY` is declared in `worker/src/types` but no sender is wired.

### Cron (reminders, cleanup)

`worker/src/index.ts` exports a `scheduled` handler that prunes expired
sessions and rate-limit rows. To activate it, add to `wrangler.toml`:

```toml
[triggers]
crons = ["0 * * * *"]
```

---

## Operational notes

- **Secrets** are set with `wrangler secret put` and never committed. `.dev.vars`
  is gitignored.
- **Backups** — D1 supports time-travel restore for the last 30 days:
  `npx wrangler d1 time-travel restore homecell-db --timestamp=<iso>`.
- **Migrations** are forward-only and applied in filename order. Add new files
  as `0002_*.sql`, `0003_*.sql`, and so on; never edit an applied migration.
- **Logging** — set `[observability] enabled = true` (already on) to see Worker
  logs in the Cloudflare dashboard. Prayer request bodies are deliberately never
  written to logs.
- **Free plan CPU limit** — lower `PBKDF2_ITERATIONS` in
  `worker/src/lib/crypto.ts` to `25_000` on the Workers free plan. Existing
  hashes keep working because the iteration count is stored per row.
