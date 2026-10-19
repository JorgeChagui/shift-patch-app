# Phase 1: DB & Seed Data

**Goal:** a Prisma schema on Supabase PostgreSQL that holds the exact sample data from the technical spec, shared helpers every route will use, and a CI pipeline that keeps `main` green from the start.

**Depends on:** project setup (done).

---

- [ ] **P1-01 Prisma setup**
  - **Goal:** Prisma installed and connected to Supabase using the pooled URL at runtime and the direct URL for migrations.
  - **Files:** `package.json`, `prisma/schema.prisma` (and `prisma.config.ts` if the installed Prisma version uses it), `src/lib/db.ts`, `.env.example`
  - **Acceptance criteria:**
    - `DATABASE_URL` (port 6543, `pgbouncer=true`) is used by the client; `DIRECT_URL` (port 5432) is used by migrations.
    - `src/lib/db.ts` exports a single client instance reused across hot reloads in dev.
    - `.env.example` lists every variable needed; no real values committed.
  - **Verify:** `npx prisma validate`; `npm run type-check`.

- [ ] **P1-02 Schema**
  - **Goal:** models covering the whole committed scope, with string IDs so seed IDs match the spec exactly.
  - **Files:** `prisma/schema.prisma`
  - **Acceptance criteria:**
    - `Agency` (id, name).
    - `User` (id, name, email unique, passwordHash, role enum `nurse | agency | admin`, agencyId nullable → Agency).
    - `Shift` (id, agencyId, role, date, startTime, endTime as strings, status enum `open | filled | cancelled`, claimedById nullable → User, createdAt, updatedAt).
    - `Credential` (id, nurseId, type `license | tb-test`, fileKey nullable, fileName nullable, expiresAt as `YYYY-MM-DD` string, uploadedAt).
    - `ShiftCancellation` (id, shiftId, reason `no-show | advance`, previousNurseId, cancelledById, createdAt).
    - `AuditLog` (id, actorId nullable, action, entityType, entityId, metadata JSON, createdAt), indexed on createdAt.
    - `Timesheet` (id, shiftId unique, nurseId, hours, status `pending | approved`, approvedById nullable, approvedAt nullable).
    - `Notification` (id, userId, message, kind `success | error | info`, readAt nullable, createdAt).
    - A sequence (or counter table) for `shift-<n>` IDs (cross-phase decision 1).
    - Enum values that contain `-` (`no-show`, `tb-test`) are mapped so the API emits the exact spec strings.
  - **Verify:** `npx prisma validate`; `npx prisma format` leaves no diff.

- [ ] **P1-03 First migration**
  - **Goal:** schema applied to Supabase through a committed migration.
  - **Files:** `prisma/migrations/**`, `package.json` scripts (`db:migrate`, `db:generate`)
  - **Acceptance criteria:** `prisma migrate deploy` runs cleanly on an empty database; the generated client is created on `postinstall` or `build` so Vercel and CI have it.
  - **Verify:** run the migration against the Supabase project; `npx prisma migrate status` reports up to date.

- [ ] **P1-04 Seed**
  - **Goal:** an idempotent seed that loads the sample data exactly as given.
  - **Files:** `prisma/seed.ts`, `package.json` scripts (`db:seed`, `db:reset`)
  - **Acceptance criteria:**
    - Agencies `agency-a` (Sunrise Health Staffing) and `agency-b` (Metro Care Partners).
    - Agency logins `admin@sunrisehealth.example` and `admin@metrocare.example` with role `agency`, linked to their agency. User IDs for these are our choice (e.g. `agency-a-admin`); the login response returns that id.
    - Nurses `nurse-1` Maria Lopez (license expires 2027-01-01) and `nurse-2` James Cook (license expired 2026-06-01).
    - Admin `admin-1` Alex Kim.
    - Every password is `Trial2026!`, hashed with `bcryptjs`.
    - Shifts `shift-1`, `shift-2` (filled by `nurse-1`), `shift-3`, exactly as in the spec table. A `pending` timesheet exists for `shift-2`.
    - The shift ID sequence is set so the next created shift gets the next free number.
    - Running the seed twice gives the same state. `db:reset` wipes and reseeds (used by tests and E2E).
  - **Verify:** `npm run db:reset`, then query the tables and compare with the spec.

- [ ] **P1-05 Shared helpers**
  - **Goal:** one place for the shift response shape, time maths and audit writes.
  - **Files:** `src/lib/shifts.ts`, `src/lib/audit.ts`, `src/lib/time.ts` (or inside `shifts.ts`)
  - **Acceptance criteria:**
    - `toShiftDto(shift)` returns exactly `id, agencyId, agencyName, role, date, startTime, endTime, status, claimedBy` in that key order, `claimedBy: null` when unclaimed.
    - `shiftHours(startTime, endTime)` and `shiftEnd(date, startTime, endTime)` apply the overnight rule (decision 11).
    - `writeAudit(tx, { actorId, action, entityType, entityId, metadata })` works with a transaction client, so state changes and their audit rows commit together.
  - **Verify:** unit tests in P1-07.

- [ ] **P1-06 Minimal CI**
  - **Goal:** every push and PR runs type-check and lint.
  - **Files:** `.github/workflows/ci.yml`
  - **Acceptance criteria:** Node version matches local; uses `npm ci` with caching; runs `npm run type-check` and `npm run lint`; needs no secrets.
  - **Verify:** push a branch and confirm the workflow passes on GitHub.

- [ ] **P1-07 Tests and test DB strategy**
  - **Goal:** Vitest covers the helpers and the seed, against a database that is safe to reset.
  - **Files:** `tests/api/shifts-helpers.test.ts`, `tests/api/seed.test.ts`, `vitest.config.ts`, `.env.example` (e.g. `TEST_DATABASE_URL`)
  - **Acceptance criteria:**
    - Decide and write down (in this file, under "Notes") where tests run: a separate Supabase project/schema, or local Postgres via Docker. Tests never touch the production database.
    - `toShiftDto` output for `shift-1` equals the spec JSON.
    - `shiftHours("19:00", "07:00") === 12` and `shiftHours("07:00", "19:00") === 12`.
    - After `db:reset`, the seed test finds exactly the spec's agencies, users, credentials and shifts.
  - **Verify:** `npm run test:api`.

## Definition of done

- Migration and seed run against Supabase.
- `type-check`, `lint`, `test:api` pass locally; CI is green on GitHub.

## Notes

_Record decisions made during this phase here (e.g. the test DB strategy)._
