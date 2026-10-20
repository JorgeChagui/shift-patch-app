# Phase 3: Frontend & Test IDs

**Goal:** a usable UI for all three roles on top of the Phase 2 APIs, with every required `data-testid` on the element that performs the action.

**Depends on:** Phase 2 (all APIs, cookie session, `proxy.ts`).

Use the `frontend-design` skill for visual direction and `next-best-practices` for RSC/client boundaries. Existing placeholder pages in `src/app/(nurse)`, `src/app/(agency)`, `src/app/(admin)` and `src/app/login` are replaced here.

---

- [x] **P3-01 UI foundation**
  - **Goal:** shared shell for every role.
  - **Files:** `components.json`, `src/components/ui/*`, `src/app/layout.tsx`, `src/components/app-shell.tsx`, `src/app/page.tsx`
  - **Acceptance criteria:** shadcn/ui initialised for Tailwind v4; header with app name, current user and role, role-specific nav links, logout. `/` redirects to the role's home when logged in, else to `/login`. Responsive down to phone width.
  - **Verify:** manual check for each role; `npm run build`.

- [x] **P3-02 Login page**
  - **Goal:** login form that routes each role to its home.
  - **Files:** `src/app/login/page.tsx`, `src/app/login/login-form.tsx`
  - **Acceptance criteria:**
    - `login-email-input`, `login-password-input`, `login-submit-button`.
    - On success: nurse → `/shifts`, agency → `/agency/shifts`, admin → `/admin`.
    - On 401: `notification-banner` shows "Invalid email or password".
  - **Verify:** manual login with all five seed accounts.

- [x] **P3-03 Notification banner**
  - **Goal:** one confirmation component for success and error.
  - **Files:** `src/components/notification-banner.tsx`
  - **Acceptance criteria:** `data-testid="notification-banner"` for both kinds; the text carries the message (e.g. "Shift claimed", "Credential expired, cannot claim shift"); styling differs by kind; `role="status"` / `role="alert"` for accessibility; dismissible.
  - **Verify:** used by P3-02, P3-04 to P3-06.

- [x] **P3-04 Nurse marketplace (`/shifts`)**
  - **Goal:** browse and claim shifts, cancel own claims.
  - **Files:** `src/app/(nurse)/shifts/page.tsx`, `src/app/(nurse)/shifts/*`
  - **Acceptance criteria:**
    - Each row has `shift-list-item` and shows agency, role, date, times (overnight marked), status.
    - `shift-claim-button` on open shifts. Success → "Shift claimed" banner and the row updates. 403 → banner with the API's error text.
    - "My shifts" section with `shift-cancel-button` on the nurse's own filled shifts (sends `reason: "advance"`).
    - Shows a warning with a link to `/credentials` when the nurse's license has expired.
  - **Verify:** Maria claims `shift-1`; James sees the expired banner.

- [x] **P3-05 Nurse credentials (`/credentials`)**
  - **Goal:** upload a credential with an expiry date.
  - **Files:** `src/app/(nurse)/credentials/page.tsx`, `src/app/(nurse)/credentials/*`
  - **Acceptance criteria:** `credential-upload-input` (file input), `credential-expiry-date-input`, a type select (`license` / `tb-test`), a submit button; banner on success or error; list of current credentials with valid/expired status and expiry.
  - **Verify:** James uploads a license expiring in the future, then claims a shift.

- [x] **P3-06 Agency shifts (`/agency/shifts`)**
  - **Goal:** post and manage the agency's shifts.
  - **Files:** `src/app/(agency)/agency/shifts/page.tsx`, `src/app/(agency)/agency/shifts/*`
  - **Acceptance criteria:**
    - `agency-post-shift-button` opens the form (dialog or inline); form fields role, date, start, end; `agency-post-shift-submit-button` submits; banner on result; the list refreshes.
    - List of the agency's own shifts (from `GET /api/agencies/:agencyId/shifts`) with status and nurse.
    - Filled shifts have `shift-cancel-button` with a reason choice (no-show / advance). Open shifts can be withdrawn.
  - **Verify:** agency-a posts a shift and it shows in Maria's marketplace; agency-a cancels `shift-2` as no-show.

- [x] **P3-07 Admin dashboard (`/admin`)**
  - **Goal:** live view of which shifts are open, filled or cancelled, and by whom.
  - **Files:** `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/*`
  - **Acceptance criteria:**
    - Status count cards.
    - `admin-dashboard-shift-table` with one row per shift: agency, role, date/time, `admin-shift-status-badge` (`open` / `filled` / `cancelled` as text), nurse.
    - Subscribes to `/api/admin/stream` and refetches on `shifts-changed`; falls back to polling (e.g. every 10 s) if `EventSource` errors; shows a "live" / "polling" indicator.
  - **Verify:** dashboard open in one window, claim in another; the row updates without a reload.

- [x] **P3-08 Audit log and timesheets pages**
  - **Goal:** admin reporting views.
  - **Files:** `src/app/(admin)/admin/audit-log/page.tsx`, `src/app/(admin)/admin/timesheets/page.tsx`, optionally `src/app/(agency)/agency/timesheets/page.tsx`
  - **Acceptance criteria:** `audit-log-table` (time, actor, action, entity, details), newest first. `timesheet-table` (shift, nurse, date, hours, status, approve action). Agencies get the same table scoped to their shifts.
  - **Verify:** after a claim and a cancel, both appear in the audit log; the timesheet can be approved.

- [x] **P3-09 Test ID check**
  - **Goal:** confirm all 15 required test IDs exist exactly once per intended element.
  - **Files:** none (or a small script in `scripts/`)
  - **Acceptance criteria:** each ID from the spec table is found in `src/` on the element that performs the action: `login-email-input`, `login-password-input`, `login-submit-button`, `shift-list-item`, `shift-claim-button`, `shift-cancel-button`, `credential-upload-input`, `credential-expiry-date-input`, `agency-post-shift-button`, `agency-post-shift-submit-button`, `admin-dashboard-shift-table`, `admin-shift-status-badge`, `audit-log-table`, `timesheet-table`, `notification-banner`.
  - **Verify:** grep for each ID; extend `tests/e2e/smoke.spec.ts` so each page renders its IDs.

## Definition of done

- Every role's flow works manually on seeded data.
- `type-check`, `lint`, `test:api`, `test:e2e` pass; CI green.

## Notes

- **Services + Server Actions.** Route-handler logic moved to `src/lib/services/*` (mutations, returning a `ServiceResult`) and `src/lib/data/*` (reads). Route handlers and Server Actions (`src/actions/*`, built with `defineAction` in `src/lib/actions.ts`) both call them, so rules live in one place. The API contracts are unchanged (the full `test:api` suite passes against the refactor).
- **Caching.** Reads in `src/lib/data` use `'use cache'` + `cacheLife("marketplace")` (stale 30 s, revalidate 60 s, expire 1 h, in `next.config.ts`) + `cacheTag`. Arguments are IDs, never cookies, so entries are shared. Every mutation expires its tags (`MUTATION_TAGS` in `src/lib/cache-tags.ts`): `updateTag` in Server Actions, `revalidateTag(tag, { expire: 0 })` in route handlers. The admin credential list (signed URLs) and notifications stay uncached. Changes made straight to the DB (e.g. `db:seed` while the server runs) show up within the cache window.
- **Rendering.** `/login` is static (○). Every role page is a static shell (header, headings, skeletons) with Suspense sections that read the session (◐). `/` is redirected in `proxy.ts`. Pages also call `requireSession(role)`, as defense in depth behind the proxy.
- **Banner.** One `notification-banner`, inline at the top of the content, driven by `NotificationProvider` / `useNotify`. Every form uses `useActionFeedback`, so the banner shows the action's result; error text is the API's own (e.g. "Credential expired, cannot claim shift"). It clears on navigation.
- **`shift-list-item`** is on the rows of the nurse's "Open shifts" list only. "My shifts" rows (the nurse's filled shifts) carry `shift-cancel-button` instead.
- **Agency cancel.** A reason select (no-show / advance) next to `shift-cancel-button`, which submits. The nurse's cancel sends `reason: "advance"` as a hidden field.
- **Expired-license warning** is a separate `role="note"` callout, not the banner, so tests reading the banner never see two messages.
- **Agency timesheets** (`/agency/timesheets`) were added, sharing `TimesheetTable` with the admin page.
- **Admin live view.** `useLiveShifts` = `useEventSource` (refetch on `ready` and `shifts-changed`; an error counts as a failure only once the stream is closed or 3 errors in a row, since the server closes every ~55 s) + `usePolling` (10 s) as the fallback. Verified by blocking `/api/admin/stream`.
- **Design.** Light-only palette tokens in `globals.css` (soft medical blue brand, surgical mint secondary, cool neutrals, semantic status and alert colours). Atkinson Hyperlegible Next as the single typeface. `ShiftTimeStrip` (a 24 h bar; hatched past midnight) is the signature element.
- **Test IDs.** `npm run check:testids` (`scripts/check-testids.ts`) confirms all 15. `tests/e2e/smoke.spec.ts` signs in as each role and asserts each page's IDs (read-only; mutating flows are Phase 4).
- **Vitest.** `server-only` and `next/cache` are aliased to no-op stubs (`tests/stubs`), so the data layer runs uncached in API tests.
- **Follow-up.** Stored `Notification` rows (P2-14) are not shown in the UI yet.
