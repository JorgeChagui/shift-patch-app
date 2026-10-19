# Phase 4: Testing & CI/CD

**Goal:** end-to-end coverage of the main flows, a full CI pipeline, and a live deployment loaded with the sample data.

**Depends on:** Phase 3.

---

- [ ] **P4-01 Playwright setup**
  - **Goal:** reliable, repeatable E2E runs.
  - **Files:** `playwright.config.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/global-setup.ts`
  - **Acceptance criteria:** `webServer` starts the app; the test DB is reset and seeded before the run (and between specs that mutate data, or tests are ordered to avoid clashes); a fixture logs in as any seed user; selectors use the required test IDs.
  - **Verify:** `npm run test:e2e` runs locally from a clean DB.

- [ ] **P4-02 E2E flows**
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

- [ ] **P4-03 Full CI**
  - **Goal:** CI runs everything the repo requires.
  - **Files:** `.github/workflows/ci.yml`
  - **Acceptance criteria:** jobs for type-check, lint, `test:api`, `test:e2e`. Database from a Postgres service container (preferred) or a dedicated test Supabase project via GitHub secrets. Migrations and seed run before tests. Playwright report uploaded as an artifact on failure. Required status check on `main`.
  - **Verify:** green run on a PR.

- [ ] **P4-04 Vercel deployment**
  - **Goal:** a public URL with the sample data.
  - **Files:** `vercel.json` (only if needed), `package.json` build script
  - **Acceptance criteria:** env vars set in Vercel (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); migrations applied and seed loaded on the production DB; private Storage bucket exists; preview deploys don't touch production data.
  - **Verify:** `curl` the live URL with each spec example (login, list, post, claim, cancel, agency scoping) and compare with the spec; walk each role's UI flow.

- [ ] **P4-05 Secrets audit**
  - **Goal:** no secrets in git history.
  - **Files:** `.gitignore`, optionally `.github/workflows/ci.yml` (gitleaks step)
  - **Acceptance criteria:** gitleaks (or equivalent) over full history finds nothing; only `.env.example` is tracked; no service-role key reaches client bundles.
  - **Verify:** run gitleaks locally; `grep` the `.next` client output for the key name.

- [ ] **P4-06 README**
  - **Goal:** reviewer can understand, run and test the project quickly.
  - **Files:** `README.md`
  - **Acceptance criteria:** live URL; test accounts; local setup (env, migrate, seed, dev); test commands; architecture overview (auth, real-time approach, storage); scope decisions (email/PostHog substitutes, cross-phase decisions); what's next.
  - **Verify:** follow the README from a fresh clone.

## Definition of done

- CI green on `main` with all four checks.
- The live URL passes the spec walk-through for every route and test ID.

## Notes

_Record decisions made during this phase here._
