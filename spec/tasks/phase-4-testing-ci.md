# Phase 4: Testing & CI/CD

**Goal:** end-to-end coverage of the main flows, a full CI pipeline, and a live deployment loaded with the sample data.

**Depends on:** Phase 3.

---

- [x] **P4-01 Playwright setup**
  - **Goal:** reliable, repeatable E2E runs.
  - **Files:** `playwright.config.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/global-setup.ts`
  - **Acceptance criteria:** `webServer` starts the app; the test DB is reset and seeded before the run (and between specs that mutate data, or tests are ordered to avoid clashes); a fixture logs in as any seed user; selectors use the required test IDs.
  - **Verify:** `npm run test:e2e` runs locally from a clean DB.

- [x] **P4-02 E2E flows**
  - **Goal:** cover the committed scope through the UI.
  - **Files:** `tests/e2e/*.spec.ts`
  - **Acceptance criteria:** specs for:
    - Login for each role lands on the right page; bad password shows the error banner.
    - Maria claims `shift-1` → banner "Shift claimed", row shows filled.
    - James claims → banner "Credential expired, cannot claim shift".
    - James uploads a valid license, then claims successfully.
    - Agency posts a shift → it appears in the nurse marketplace.
    - Agency cancels `shift-2` as no-show → shift reopens; admin badge shows `open`.
    - Admin dashboard updates live after a claim in another browser context.
    - Audit log and timesheets tables show the actions above.
    - Role gating: a nurse visiting `/admin` is redirected.
  - **Verify:** `npm run test:e2e`.

- [x] **P4-03 Full CI**
  - **Goal:** CI runs everything the repo requires.
  - **Files:** `.github/workflows/ci.yml`
  - **Acceptance criteria:** jobs for type-check, lint, `test:api`, `test:e2e`. Database from a Postgres service container (preferred) or a dedicated test Supabase project via GitHub secrets. Migrations and seed run before tests. Playwright report uploaded as an artifact on failure. Required status check on `main`.
  - **Verify:** green run on a PR.

- [ ] **P4-04 Vercel deployment**
  - **Goal:** a public URL with the sample data.
  - **Files:** `vercel.json` (only if needed), `package.json` build script
  - **Acceptance criteria:** env vars set in Vercel (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`); migrations applied and seed loaded on the production DB; private Storage bucket exists; preview deploys don't touch production data.
  - **Verify:** `curl` the live URL with each spec example (login, list, post, claim, cancel, agency scoping) and compare with the spec; walk each role's UI flow.

- [x] **P4-05 Secrets audit**
  - **Goal:** no secrets in git history.
  - **Files:** `.gitignore`, optionally `.github/workflows/ci.yml` (gitleaks step)
  - **Acceptance criteria:** gitleaks (or equivalent) over full history finds nothing; only `.env.example` is tracked; no Supabase secret key reaches client bundles.
  - **Verify:** run gitleaks locally; `grep` the `.next` client output for the key name.

- [x] **P4-06 README**
  - **Goal:** reviewer can understand, run and test the project quickly.
  - **Files:** `README.md`
  - **Acceptance criteria:** live URL; test accounts; local setup (env, migrate, seed, dev); test commands; architecture overview (auth, real-time approach, storage); scope decisions (email/PostHog substitutes, cross-phase decisions); what's next.
  - **Verify:** follow the README from a fresh clone.

## Definition of done

- CI green on `main` with all four checks.
- The live URL passes the spec walk-through for every route and test ID.

## Notes

_Record decisions made during this phase here._

- **E2E database and server.** E2E uses its own `shiftpatch_e2e` DB (`E2E_DATABASE_URL`, else `TEST_DATABASE_URL` renamed), so API and E2E runs never reset each other. `tests/e2e/global-setup.ts` migrates and seeds it once. `'use cache'` reads can't see a reseed made behind the app's back, so there is no mid-run reseed: Playwright starts a fresh production build (`build && start`) on port 3100 every run (`reuseExistingServer: false`). That also lets it run next to `next dev`, which Next 16 locks to one instance.
- **Order-independent specs.** Each spec file touches different seed data:
  - claim: shift-1 (Maria) and shift-3 (James)
  - cancel: shift-2
  - post-shift and live-dashboard: their own new shifts
  - auth: read-only

  So files run in parallel and any file can run alone. Tests inside a file run in order (James: blocked → upload → claim). Retries are off, because a retried mutating test would meet the state it already changed. Audit log and timesheet assertions sit next to the action they check, rather than in a separate spec.
- **`data-shift-id`** is on nurse shift rows, agency table rows and timesheet rows (the admin table already had it), so specs target exact shifts.
- **Module format.** Playwright loads TS as CommonJS, so `import.meta` can't appear in anything it imports. The test DB helpers moved to `scripts/test-db.ts` (`scripts/test-db-setup.ts` is now just the CLI), and the E2E setup runs `prisma/seed.ts` with `tsx`.
- **CI database.** The `test` job runs the Supabase CLI stack (`supabase start -x …`, keeping only db, storage-api and kong), so credential uploads in E2E hit real Storage. The Storage key comes from `supabase status -o env`.
- **gitleaks** runs via its Docker image (v8.30.1) over the full history, in CI and locally. No leaks found. The only tracked env file is `.env.example`. No secret key name or value appears in `.next/static`.
- **Upload limit 4 MB** (was 5). Vercel rejects request bodies over 4.5 MB before they reach the function, and uploads go through a Server Action. Changed in `MAX_CREDENTIAL_BYTES`, `serverActions.bodySizeLimit` (4.5mb), the bucket limit and the UI hint.
- **Vercel ↔ Supabase.** No CORS setup: the browser never calls Supabase (Storage is server-side only, and signed URLs are API output). Preview builds are skipped (`vercel.json` `ignoreCommand`), and the env vars are Production-only. `npm run storage:setup:prod` creates or updates the private bucket.
