# ShiftPatch

A nursing shift marketplace. Agencies post open shifts, nurses browse and claim them (blocked when their license has lapsed), and admins watch every shift update live.

**Live:** https://shift-patch-app.vercel.app

| Role | Email | Lands on |
|---|---|---|
| Nurse (valid license) | `maria.lopez@example.com` | `/shifts` |
| Nurse (license expired 2026-06-01) | `james.cook@example.com` | `/shifts` |
| Agency: Sunrise Health Staffing | `admin@sunrisehealth.example` | `/agency/shifts` |
| Agency: Metro Care Partners | `admin@metrocare.example` | `/agency/shifts` |
| Admin | `alex.kim@example.com` | `/admin` |

Every password is `Trial2026!`. The login page also lists these accounts.

The specs live in [`spec/`](spec/):
- [technical spec](spec/ShiftPatch-Technical-Spec.md): API contracts, sample data, required `data-testid`s
- [raw requirements](spec/raw-requirements.md): committed scope
- [phased tasks](spec/tasks/README.md): status board and cross-phase decisions

## Run it locally

You need Node 24 (`.nvmrc`) and Docker. The local database is the Supabase CLI stack (Postgres, Storage, Studio) in Docker.

```bash
npm install
npm run db:start     # DB on 127.0.0.1:34322, Studio on http://127.0.0.1:34323
cp .env.example .env # fill in the "Local development" block; SUPABASE_SECRET_KEY comes from `npm run db:status`
npm run db:migrate   # apply prisma/migrations
npm run db:seed      # load the spec sample data (idempotent)
npm run dev          # http://localhost:3000
```

The ports are 3432x instead of Supabase's default 5432x, because Windows/WSL (Hyper-V) often reserves the 54xxx range.
- `npm run db:reset` wipes the database and reseeds it.
- `npm run db:stop` stops the stack.

## Tests

```bash
npm run type-check     # next typegen + tsc
npm run lint
npm run test:api       # Vitest: route handlers called directly, against shiftpatch_test
npm run test:e2e       # Playwright: production build on :3100, against shiftpatch_e2e
npm run check:testids  # all 15 required data-testids exist in src/
npm run security:audit # npm audit of production dependencies (high and above fails)
npm run security:sast  # Semgrep OWASP Top 10 + TS/React/Next.js/secrets rules (Docker)
```

The test suites never touch dev or production data:
- **API tests** use a `shiftpatch_test` database in the local container (`TEST_DATABASE_URL`). It is created, migrated and reseeded automatically. The setup refuses any non-local host.
- **E2E** uses its own `shiftpatch_e2e` database. It is seeded once per run, and Playwright starts a fresh production server on port 3100, so it can run alongside `npm run dev`.

  Each spec file works on different seed shifts, so files run in parallel and any file can run alone (`npm run test:e2e -- claim`). The specs cover:
  - login and role gating
  - claiming, including the expired-credential block, then an upload and a successful claim
  - posting a shift
  - a no-show cancellation
  - the live admin dashboard across two browsers
  - the audit log and timesheets

  The HTML report is written to `playwright-report/`.

**CI** (`.github/workflows/ci.yml`) runs on every push and PR:
- `check`: type-check, lint (including `eslint-plugin-security`) and `security:audit`
- `test`: the Supabase CLI stack (Postgres + Storage) in the runner, then `test:api` and `test:e2e`. The Playwright report is uploaded when it fails.
- `gitleaks`: scans the full git history
- `semgrep`: the `security:sast` scan; any finding fails the build

CodeQL (`security-extended`) runs on pushes and PRs to `main` and weekly; Dependabot proposes grouped npm and Actions updates. Workflows run with read-only tokens, and actions are pinned to commit SHAs.

## Security

Hardened in [Phase 5](spec/tasks/phase-5-hardening.md). `tests/api/security.test.ts` attacks each control below and expects it to hold.

- **Access control:** every handler authenticates and checks the role on the server, with ownership checks (an agency can only touch its own shifts, a user only their own notifications). zod validates every body and param, with length caps.
- **Tokens:** HS256 pinned, with `iss`, `aud`, `exp` and a unique `jti` verified. `JWT_SECRET` must be at least 32 characters. Logout revokes that token server-side, so a stolen copy stops working.
- **Brute force:** after 5 failed logins per email, or 20 per IP, within 15 minutes, login returns `429`. Failed logins are audited. Unknown emails cost the same bcrypt work, so response times don't reveal which accounts exist.
- **CSRF:** Server Actions use Next's origin check. API calls that change state and are authenticated by the cookie must be same-origin; Bearer calls are not affected.
- **Headers:** CSP (`frame-ancestors 'none'`, `object-src 'none'`, same-origin everything), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS and COOP. `X-Powered-By` is off. The CSP is static rather than nonce-based, so pages stay statically prerendered; that is why `script-src` allows `'unsafe-inline'`.
- **Uploads:** PDF, JPEG or PNG, checked by their magic bytes (not the client's label), at most 4 MB (oversized bodies are refused before parsing). Files go to a private bucket under a server-generated key, and are only served through 5-minute signed URLs.
- **Redirects:** `?next=` only accepts same-site paths (`//x`, `/\x` and similar are rejected).
- **Data:** Prisma queries only (the one raw query is a tagged template). RLS denies Supabase's Data API on every table. Secrets live only in env vars, and gitleaks scans the history.

**Accepted risks** ([decision 15](spec/tasks/README.md#cross-phase-decisions)):
- The demo accounts and their shared password are on the login page and in production, on purpose, for reviewers.
- `npm audit` over the full tree reports `braces` (GHSA-vfj7-8cjw-p6xm) through dev tooling only (`shadcn` CLI, `eslint-config-next`). No patched version exists, and the production tree is clean.

## Architecture

- **Next.js 16** App Router + TypeScript, Tailwind v4, shadcn/ui.
- **Data:** Prisma 7 with `@prisma/adapter-pg` on Supabase Postgres. Pooled URL (6543) at runtime, session pooler (5432) for migrations. RLS is enabled with no policies on every table: the app connects as `postgres` through Prisma, and Supabase's Data API exposes nothing.
- **Layers:** route handlers (`src/app/api`) and Server Actions (`src/actions`) are thin. Business rules live in `src/lib/services` (mutations returning a `ServiceResult`, each writing its audit row in the same transaction). Reads live in `src/lib/data` (`'use cache'` with tags that every mutation expires).
- **Auth:** custom. `bcryptjs` hashes, plus an 8 h HS256 JWT (`jose`).
  - The API accepts `Authorization: Bearer <token>`; the UI uses an httpOnly `SameSite=Lax` cookie.
  - `src/proxy.ts` redirects by role before rendering, from the token alone. Route handlers (`requireRole`) and pages (`requireSession`) check again in `src/lib/session.ts`, which also rejects revoked tokens and cross-site cookie requests.
- **Real-time admin dashboard:** `GET /api/admin/stream` is Server-Sent Events. It polls the DB every 3 s (latest audit entry and shift update) and sends `shifts-changed`. It closes after 55 s to fit the Vercel function limit, and the browser reconnects. The client also polls every 10 s as a fallback. There is no in-memory emitter, because serverless instances don't share memory.
- **Credential files:** a private Supabase Storage bucket, accessed only from the server with `SUPABASE_SECRET_KEY`.
  - Uploads go browser → Server Action → Storage, up to 4 MB (under Vercel's 4.5 MB request body limit).
  - Admins get short-lived signed URLs.
  - The browser never calls Supabase directly, so there is no CORS to configure.
- **Claim rule:** a nurse's most recent license must not expire before the shift date. Otherwise the API returns `403 { "error": "Credential expired, cannot claim shift" }`, and the blocked attempt is audited.

## Scope decisions

- **Email → in-app notifications.** Claims and cancellations store `Notification` rows, and actions report back through the `notification-banner`. No email provider is wired up.
- **PostHog → audit log.** Product events (logins, posts, claims, blocked claims, cancellations, uploads, approvals) are recorded in the audit log, which admins can read at `/admin/audit-log`.
- **Not built:** the one-click inspector export, real email and analytics.
- The gaps the spec leaves are filled by the [cross-phase decisions](spec/tasks/README.md#cross-phase-decisions):
  - who can cancel
  - the `cancelled` status (agency withdraw)
  - status codes
  - shift ID sequence
  - overnight hours

## Deployment

The app is deployed on Vercel from `main`. Preview builds are skipped (`vercel.json`), and the env vars are scoped to Production, so nothing but `main` reaches production data. Production setup reads `.env.production.local`:

```bash
npm run db:deploy:prod      # prisma migrate deploy
npm run db:seed:prod        # load the sample data
npm run storage:setup:prod  # create/update the private credentials bucket
```

Vercel env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`. The app calls itself same-origin. If you add a custom domain behind a proxy, Server Actions may need `serverActions.allowedOrigins`.

## What's next

- Show stored notifications in the UI (the API exists: `GET /api/notifications`).
- The inspector export: a zip of license and TB test files from the private bucket.
- Real email (Resend) and PostHog, fed from the same service-layer events as the audit log.
- Preview environments on a separate Supabase project.
