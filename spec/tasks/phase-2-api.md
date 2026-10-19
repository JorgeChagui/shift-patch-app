# Phase 2: API Routes

**Goal:** every API the product needs: the six required routes, matching the technical spec exactly, and the supporting routes for credentials, audit log, timesheets and the real-time admin dashboard. Each route has Vitest coverage.

**Depends on:** Phase 1 (schema, seed, `toShiftDto`, `writeAudit`).

**Rules for every handler** (see `AGENTS.md`): role check on the server, `zod` on every body and param, errors as `{ "error": "<message>" }`, an audit entry for every state change written in the same transaction. Read `node_modules/next/dist/docs/` for route handlers and `proxy.ts` before starting.

---

- [x] **P2-01 Auth core and HTTP helpers**
  - **Goal:** one session mechanism for API clients (Bearer token) and the UI (httpOnly cookie).
  - **Files:** `src/lib/auth.ts`, `src/lib/http.ts`
  - **Acceptance criteria:**
    - `signToken(user)` / `verifyToken(token)` with `jose` (HS256, `JWT_SECRET`, sensible expiry). Payload: `sub` (user id), `role`, `name`, `agencyId`.
    - `getSession(request)` reads `Authorization: Bearer <token>` first, then the cookie, and returns the session or `null`. It must also run in `proxy.ts`.
    - `requireRole(request, ...roles)` returns the session or a ready 401/403 response.
    - `jsonError(status, message)` and a `parseBody(schema, request)` helper that returns a 400 with the first zod issue.
  - **Verify:** unit tests: valid, expired and tampered tokens; header beats cookie.

- [x] **P2-02 `POST /api/auth/login` (+ logout, me)**
  - **Goal:** the spec's login contract.
  - **Files:** `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/me/route.ts`
  - **Acceptance criteria:**
    - 200 → `{ "token": "<jwt>", "user": { "id", "name", "role" } }` for all five seed accounts; also sets the httpOnly cookie (`Secure` in production, `SameSite=Lax`).
    - Wrong email or password → 401 `{ "error": "Invalid email or password" }` (same message for both).
    - Successful logins are audited (`auth.login`).
    - `logout` clears the cookie. `me` returns the current `user` or 401.
  - **Verify:** API tests for each role, a wrong password and an unknown email.

- [x] **P2-03 `proxy.ts` route protection**
  - **Goal:** UI routes are gated by role before rendering.
  - **Files:** `src/proxy.ts` (or root `proxy.ts`, per the Next 16 docs)
  - **Acceptance criteria:** no session → redirect to `/login`. `/shifts` and `/credentials` → nurse; `/agency/*` → agency; `/admin/*` → admin. Wrong role → redirect to that role's home. `/api/*` is not redirected (handlers return JSON errors themselves).
  - **Verify:** API/integration test or manual check with each role's cookie.

- [x] **P2-04 `GET /api/shifts`**
  - **Goal:** the marketplace list across all agencies.
  - **Files:** `src/app/api/shifts/route.ts`
  - **Acceptance criteria:** any authenticated role (decision 3); 200 `{ "shifts": [...] }` in `toShiftDto` shape, ordered by date then startTime; no token → 401.
  - **Verify:** API test comparing the seeded response with the spec.

- [x] **P2-05 `POST /api/shifts`**
  - **Goal:** agency posts an open shift.
  - **Files:** `src/app/api/shifts/route.ts`, `src/lib/validation.ts`
  - **Acceptance criteria:**
    - Agency only (others → 403). `agencyId` comes from the token, never from the body.
    - Body `{ role, date, startTime, endTime }`: `role` non-empty (RN, LPN, CNA…), `date` valid `YYYY-MM-DD`, times `HH:mm`, start ≠ end.
    - 201 with the new shift (`status: "open"`, `claimedBy: null`, id `shift-<n>`). Audited (`shift.created`).
  - **Verify:** API test with the spec's example body; validation 400s; nurse token → 403.

- [x] **P2-06 `POST /api/shifts/:id/claim`**
  - **Goal:** nurse claims an open shift, blocked when credentials have lapsed.
  - **Files:** `src/app/api/shifts/[id]/claim/route.ts`, `src/lib/credentials.ts`
  - **Acceptance criteria:**
    - Nurse only. Unknown id → 404.
    - Credential check (decision 2) → 403 `{ "error": "Credential expired, cannot claim shift" }`, and the blocked attempt is audited.
    - Shift not `open` → 409. The update is conditional (`where status = open`), so two simultaneous claims can't both win.
    - 200 with the updated shift. In one transaction: shift → `filled`, timesheet created, notification to the nurse, audit `shift.claimed`.
  - **Verify:** API tests: Maria claims `shift-1` → 200 matching spec JSON; James → 403 exact message; claiming `shift-2` → 409.

- [x] **P2-07 `POST /api/shifts/:id/cancel`**
  - **Goal:** cancellation and no-show handling that reopens the shift.
  - **Files:** `src/app/api/shifts/[id]/cancel/route.ts`
  - **Acceptance criteria:**
    - Body `{ reason: "no-show" | "advance" }`. Permissions per decision 4. Shift not `filled` → 409.
    - 200 → shift shape with `status: "open"`, `claimedBy: null`, plus `"cancellation": { "reason", "previousNurseId" }`.
    - Same transaction: `ShiftCancellation` row, timesheet voided, notification to the previous nurse, audit `shift.cancelled` with the reason.
  - **Verify:** API test reproduces the spec example on `shift-2`; nurse sending `no-show` → 403; other agency → 403.

- [x] **P2-08 `GET /api/agencies/:agencyId/shifts`**
  - **Goal:** an agency's own shifts.
  - **Files:** `src/app/api/agencies/[agencyId]/shifts/route.ts`
  - **Acceptance criteria:** 200 `{ "agencyId", "shifts": [...] }` in full shift shape. Own agency or admin only; another agency → 403 (decision 6). Unknown agency → 404.
  - **Verify:** API tests: agency-a gets `shift-1` and `shift-2`; agency-b gets `shift-3` only; agency-a asking for agency-b → 403.

- [x] **P2-09 Credentials API**
  - **Goal:** nurses upload license / TB test documents with an expiry date.
  - **Files:** `src/app/api/credentials/route.ts`, `src/lib/storage.ts`
  - **Acceptance criteria:**
    - `POST` (nurse only), multipart: `file` (PDF/JPEG/PNG, size limit e.g. 5 MB), `expiresAt` (`YYYY-MM-DD`), `type` (`license` | `tb-test`, default `license`). File goes to a private Supabase Storage bucket via the Supabase secret key (`SUPABASE_SECRET_KEY`) on the server only. 201 with the credential. Audited.
    - `GET`: a nurse sees their own credentials with computed `status` (`valid` / `expired`); an admin sees everyone's, with short-lived signed URLs.
    - Storage calls are behind `src/lib/storage.ts` so tests can mock them.
  - **Verify:** API tests with storage mocked: upload, bad file type → 400, agency → 403. After uploading a future-dated license, James can claim.

- [x] **P2-10 Audit log API**
  - **Goal:** admins can read the audit trail.
  - **Files:** `src/app/api/audit-log/route.ts`
  - **Acceptance criteria:** admin only; newest first; includes actor name; `limit` and `cursor` query params validated with zod.
  - **Verify:** API test: after a claim, the latest entry is `shift.claimed` by `nurse-1`.

- [x] **P2-11 Timesheets API**
  - **Goal:** basic timesheet tracking.
  - **Files:** `src/app/api/timesheets/route.ts`, `src/app/api/timesheets/[id]/approve/route.ts`
  - **Acceptance criteria:** `GET` scoped by role (nurse: own; agency: shifts of their agency; admin: all) with shift details, nurse name, hours, status. `POST .../approve` for the owning agency or an admin; already approved → 409; audited.
  - **Verify:** API tests for scoping and approval.

- [x] **P2-12 Admin dashboard data and real-time stream**
  - **Goal:** shift reporting and live updates without an in-memory emitter.
  - **Files:** `src/app/api/admin/shifts/route.ts`, `src/app/api/admin/stream/route.ts`, `src/app/api/shifts/[id]/withdraw/route.ts`
  - **Acceptance criteria:**
    - `GET /api/admin/shifts` (admin): counts by status, and every shift with agency name and covering nurse name.
    - `GET /api/admin/stream` (admin): SSE that checks the DB every few seconds (latest `AuditLog.createdAt` / `Shift.updatedAt`) and sends a `shifts-changed` event when something changes, plus a heartbeat comment. Closes cleanly when the client disconnects, and stays within the Vercel function duration limit (the client reconnects).
    - `POST /api/shifts/:id/withdraw` (owning agency or admin): open shift → `cancelled` (decision 5); audited.
  - **Verify:** API tests for the summary and withdraw; manual `curl -N` on the stream while claiming a shift.

- [x] **P2-13 API test suite pass**
  - **Goal:** the spec's examples, reproduced as tests.
  - **Files:** `tests/api/*.test.ts`, `tests/api/helpers.ts` (login helper, DB reset in `beforeEach`)
  - **Acceptance criteria:** every response example in the technical spec has a test asserting the same body (except `token` and newly generated IDs); every mutating route has a test checking its audit row; every route has a 401 test.
  - **Verify:** `npm run test:api`.

- [x] **P2-14 Notifications API**
  - **Goal:** let the UI show stored notifications (decision 8), including the cancellation notice the previous nurse receives.
  - **Files:** `src/app/api/notifications/route.ts`, `src/app/api/notifications/[id]/read/route.ts`
  - **Acceptance criteria:** `GET` (any role) returns the caller's own notifications, unread first then newest first. `POST .../read` marks one of the caller's own notifications read (idempotent, audited once); someone else's → 404.
  - **Verify:** API tests: after a no-show on `shift-2`, Maria sees the notice; James can't mark it read.

## Definition of done

- All six required routes match the spec byte-for-byte on seeded data.
- `type-check`, `lint`, `test:api` pass; CI green.

## Notes

_Record decisions made during this phase here._

- **No past-date rules.** The seeded and example shifts (2026-10-02 to 05) predate the build date, and the spec examples claim and post them, so neither `POST /api/shifts` nor claim rejects past dates.
- **Status-code order.** Claim: 404 → credential 403 → 409. Cancel / withdraw / approve: 404 → ownership 403 → 409. Agency shifts: another agency → 403 before the existence check, so only admins can see a 404 there.
- **Blocked claims are audited** as `shift.claim_blocked` (outside any transaction, so it is kept even though nothing else changes).
- **Cancel deletes the timesheet** rather than voiding it (it is unique per shift), so the shift can be claimed again with a fresh timesheet.
- **Auth.** JWT lifetime 8 h; cookie `shiftpatch_session` (httpOnly, `SameSite=Lax`, `Secure` in production). Unknown emails are compared against a dummy bcrypt hash so both 401s take about as long.
- **SSE.** `GET /api/admin/stream` polls the DB every 3 s (latest audit `createdAt`, latest shift `updatedAt`, shift count), sends `event: shifts-changed` or a `: ping` heartbeat, and closes itself after 55 s (`maxDuration = 60`); `retry: 3000` makes EventSource reconnect. Every audited action (including logins) triggers a refresh, which is harmless.
- **`cacheComponents` is on** (`next.config.ts`), so route segment config `export const dynamic` is not allowed; handlers that read the request are dynamic anyway.
- **Error messages.** 401 `Unauthorized`, 403 `Forbidden` (or the spec's credential message / `Nurses can only cancel in advance`), 404 `<Thing> not found`, 409 `Shift is not open` / `Shift is not filled` / `Only open shifts can be withdrawn` / `Timesheet is already approved`, 400 `<field>: <zod message>`.
- **Tests** call route handlers directly with a `Request` (no server). `tests/api/helpers.ts` reseeds in `beforeEach`; storage is mocked with `vi.mock("@/lib/storage")`. `POST /api/shifts` returns `shift-4` against the 3-shift seed (the spec's `shift-7` is illustrative).
