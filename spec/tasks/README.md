# ShiftPatch: Development Tasks

This is the development spec. It turns `spec/raw-requirements.md` (scope) and `spec/ShiftPatch-Technical-Spec.md` (contracts, sample data, test IDs) into ordered, checkable tasks. When a task and the technical spec disagree, the technical spec wins, so fix the task.

## How to use

1. Pick the first phase on the board that isn't `done`.
2. Plan it from its file (plan mode, one phase at a time). Read the cross-phase decisions below first.
3. Implement. Tick each task (`- [x]`) as it lands.
4. When the phase's definition of done is met, set it to `done` on the board, set the next phase to `in progress`, and update the "Current phase" line in `AGENTS.md`. Do this in the same commit.

## Status board

| Phase | File | Status | Notes |
|---|---|---|---|
| 1. DB & Seed Data | [phase-1-db-seed.md](phase-1-db-seed.md) | done | Includes minimal CI (type-check + lint) |
| 2. API Routes | [phase-2-api.md](phase-2-api.md) | done | Required routes + supporting APIs (auth, credentials, audit, timesheets, SSE, notifications) |
| 3. Frontend & Test IDs | [phase-3-frontend.md](phase-3-frontend.md) | done | All 15 required `data-testid`s; services + Server Actions; tagged `use cache` reads |
| 4. Testing & CI/CD | [phase-4-testing-ci.md](phase-4-testing-ci.md) | done | E2E flows, full CI (Supabase CLI), gitleaks, Vercel deploy, README |
| 5. Login Polish & Security Hardening | [phase-5-hardening.md](phase-5-hardening.md) | done | Brand panel centering; SAST (Semgrep OWASP, CodeQL, eslint-plugin-security), dependency audit, headers, throttling, revocation, CSRF, misuse tests |

Status values: `not started`, `in progress`, `done`.

## Task conventions

- IDs are `P<phase>-<nn>` (e.g. `P2-04`). They are stable: never renumber. Add new tasks at the end of a phase and mark dropped ones `~~struck~~` with a reason.
- Each task has **Goal**, **Files**, **Acceptance criteria** and **Verify**.
- Tests are written in the same phase as the code they cover. Phase 4 adds E2E coverage and CI, not unit/API tests for earlier phases.
- **Definition of done (every phase):** all tasks ticked, and `npm run type-check`, `npm run lint`, `npm run test:api` pass (plus `npm run test:e2e` from Phase 3 on).

## Cross-phase decisions

These fill gaps in the technical spec. Change them here before changing behaviour.

1. **Shift IDs.** New shifts get `shift-<n>`, continuing after the seed (the spec's example returns `shift-7`). Generate the number from a DB sequence, not `count()`, so it stays safe under concurrency.
2. **Lapsed credentials.** A nurse can't claim a shift if they have no license credential, or if their latest license (the most recently uploaded; ties broken by the later `expiresAt`) has an `expiresAt` before the shift date (a license expiring on the shift date is still valid). A newer upload replaces an older one even if it expires sooner. `nurse-2` (expired 2026-06-01) is blocked for every seeded shift, with `403 { "error": "Credential expired, cannot claim shift" }`.
3. **`GET /api/shifts`** requires an authenticated user (any role).
4. **Who can cancel.** The owning agency, an admin, or the nurse who claimed the shift. Nurses may only use `reason: "advance"`. Cancelling a shift that isn't `filled` returns 409.
5. **Statuses.** `open`, `filled`, `cancelled`. `POST /api/shifts/:id/cancel` reopens the shift (`open`, `claimedBy: null`) as the spec says. `cancelled` is reserved for an agency withdrawing a shift entirely (extra route, `POST /api/shifts/:id/withdraw`), so the admin badge can show all three.
6. **Agency scoping.** `GET /api/agencies/:agencyId/shifts` with another agency's token returns 403. Admins can read any agency.
7. **Status codes.** 400 validation error, 401 missing, invalid or revoked token, 403 wrong role, ownership, expired credential or cross-site request, 404 unknown shift or agency, 409 state conflict (e.g. claiming a filled shift), 429 too many failed logins. The body is always `{ "error": "<message>" }`.
8. **Email and PostHog substitutes.** Per the raw requirements commitment: notifications are stored as `Notification` rows and shown through `notification-banner`. Product events are recorded in the audit log, not sent to PostHog.
9. **Timesheets.** One per filled shift, created when the shift is claimed and removed or voided when it's cancelled. Hours are derived from `startTime`/`endTime` with the overnight rule (19:00 → 07:00 = 12h). Status is `pending` or `approved`. Agencies and admins approve.
10. **Credential types.** `license` and `tb-test` (the export wish list names both). Only `license` gates claiming.
11. **Times.** `date`, `startTime`, `endTime` are stored as strings (`YYYY-MM-DD`, `HH:mm`, facility-local). If `endTime <= startTime` the shift ends the next day.
12. **Login throttling.** Only failed logins count. 5 failures for one email, or 20 from one IP, within a rolling 15 minutes block further attempts with `429 { "error": "Too many login attempts, try again later" }` until the window clears. The IP is the first `x-forwarded-for` value.
13. **Session revocation.** Every token carries a unique `jti` (plus `iss`/`aud` = `shiftpatch`). Logout revokes that one token, not the user's other sessions. A revoked token gets 401 from the API and is treated as signed out by pages. `proxy.ts` stays JWT-only (no DB); pages and handlers re-check.
14. **CSRF.** A state-changing API request (not GET/HEAD) authenticated by the session **cookie** must come from this origin (`Origin` matching the host, or `Sec-Fetch-Site: same-origin`), else `403 Forbidden`. Requests with `Authorization: Bearer` are not CSRF-able and are unaffected, so the spec's curl examples work as before. Server Actions rely on Next's own origin check.
15. **Accepted risks.** (a) Demo accounts and their shared password are shown on the login page and seeded in production, by design for the assessment. (b) `npm audit` (full tree) reports the `braces` advisory GHSA-vfj7-8cjw-p6xm via dev tooling only (`shadcn` CLI, `eslint-config-next`); no patched version exists, the production tree is clean, and CI gates on `npm audit --omit=dev`. (c) Claiming past-dated shifts stays allowed (the seed data relies on it).

## Scope coverage

| Commitment (raw-requirements.md) | Tasks |
|---|---|
| Auth and role-based access | P1-02, P2-01 to P2-03, P3-02, P4-02 |
| Credential upload with expiry, claim blocking | P1-02, P2-06, P2-09, P3-05, P4-02 |
| Shift lifecycle (post, browse, claim, cancel/no-show) | P2-04 to P2-08, P3-04, P3-06, P4-02 |
| Admin dashboard, reporting, timesheets, audit log | P1-05, P2-10 to P2-12, P3-07, P3-08 |
| Real-time dashboard | P2-12, P3-07 |
| In-app notifications (email substitute) | P2-06, P2-07, P2-14, P3-03 |
| Deployment with sample data, green CI, exact contracts and test IDs | P1-04, P1-06, P3-09, P4-03 to P4-06 |
| Security review (misuse, OWASP static analysis, dependency audit, type check) | P5-02 to P5-11 |
