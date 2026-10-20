# Phase 5: Login Polish & Security Hardening

**Goal:** fix the login page's wide-screen balance, and harden the app against misuse and the reviewers' static analysis (OWASP rules, dependency audit, type check).

**Depends on:** Phase 4.

---

- [ ] **P5-01 Center the brand copy**
  - **Goal:** on wide screens the login page's left panel looks as balanced as the centered form on the right.
  - **Files:** `src/app/login/brand-panel.tsx`
  - **Acceptance criteria:** from `lg` up, the headline, paragraph and sample shifts block is horizontally centered in the left panel (wider cap at `2xl`). The logo stays top-left and the footer bottom-left. Below `lg`, nothing changes.
  - **Verify:** screenshots of `/login` at 1024, 1440 and 2560 px wide, and at phone width.

- [ ] **P5-02 Static analysis (OWASP SAST)**
  - **Goal:** the OWASP rule sets reviewers run find nothing, and CI keeps it that way.
  - **Files:** `eslint.config.mjs`, `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, `.semgrepignore`, `package.json`
  - **Acceptance criteria:**
    - `eslint-plugin-security` (recommended) is part of `npm run lint`.
    - A `semgrep` CI job runs `p/owasp-top-ten`, `p/typescript`, `p/react`, `p/nextjs` and `p/secrets` with `--error`. `npm run security:sast` runs the same scan locally through Docker.
    - CodeQL (`javascript-typescript`, `security-extended`) runs on pushes and PRs to `main`, and weekly.
    - Every finding is fixed, or suppressed inline with a written reason.
  - **Verify:** `npm run lint`, `npm run security:sast`, then a green CI run.

- [ ] **P5-03 Dependency audit**
  - **Goal:** the production dependency tree has no known high or critical advisories.
  - **Files:** `package.json`, `package-lock.json`, `.github/dependabot.yml`, `.github/workflows/ci.yml`
  - **Acceptance criteria:**
    - `shadcn` (a CLI, used at build time only for `shadcn/tailwind.css`) moves to `devDependencies`.
    - `npm run security:audit` (`npm audit --omit=dev --audit-level=high`) exits 0 and runs in CI.
    - Dependabot opens weekly grouped updates for npm and GitHub Actions.
    - The remaining dev-only advisory is documented (decision 15).
  - **Verify:** `npm run security:audit`; `npm run build` still works.

- [ ] **P5-04 CI hardening**
  - **Goal:** workflows run with least privilege on pinned actions.
  - **Files:** `.github/workflows/*.yml`
  - **Acceptance criteria:**
    - Workflows declare `permissions: contents: read`, and only CodeQL adds `security-events: write`.
    - Third-party actions are pinned to commit SHAs with a version comment.
  - **Verify:** green CI run.

- [ ] **P5-05 Security headers**
  - **Goal:** browsers get clickjacking, MIME-sniffing, referrer and transport protections.
  - **Files:** `next.config.ts`
  - **Acceptance criteria:**
    - `poweredByHeader: false`.
    - Every route sends:
      - `Content-Security-Policy`: `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `connect-src 'self'`.
      - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
      - A restrictive `Permissions-Policy`, `Strict-Transport-Security`, and `Cross-Origin-Opener-Policy: same-origin`.
    - The CSP is static (no nonce), so static and cached rendering keep working. The SSE dashboard, fonts and signed credential links still work.
  - **Verify:** `curl -I` against `npm run start`; the E2E header assertion (P5-11).

- [ ] **P5-06 Login throttling**
  - **Goal:** passwords can't be brute-forced (decision 12).
  - **Files:** `prisma/schema.prisma`, a new migration, `prisma/seed.ts`, `src/lib/services/auth.ts`, `src/app/api/auth/login/route.ts`, `src/actions/auth.ts`
  - **Acceptance criteria:**
    - Failed logins are stored as `LoginAttempt` rows (email, IP, time; the table has RLS on).
    - Once the limits are hit, the API returns `429 { "error": "Too many login attempts, try again later" }` and the form shows the same message.
    - Each failure writes an `auth.login_failed` audit entry.
    - The seed clears the table.
  - **Verify:** API tests (P5-11).

- [ ] **P5-07 Session revocation and JWT tightening**
  - **Goal:** a token is dead after logout (decision 13), and token checks are strict.
  - **Files:** `src/lib/auth.ts`, `src/lib/session.ts`, `prisma/schema.prisma` + migration, logout route and action
  - **Acceptance criteria:**
    - Tokens carry `jti`, `iss` and `aud`, which are verified.
    - `JWT_SECRET` must be at least 32 characters.
    - Logout stores the `jti` in `RevokedToken` (RLS on). API handlers and server pages treat a revoked token as signed out.
    - A malformed cookie is treated as no session rather than throwing.
    - `proxy.ts` stays DB-free.
  - **Verify:** API tests (P5-11).

- [ ] **P5-08 CSRF for cookie-authenticated API calls**
  - **Goal:** another site can't drive the JSON API with the user's cookie (decision 14).
  - **Files:** `src/lib/session.ts` (or wherever the DB-aware `requireRole` lives)
  - **Acceptance criteria:** a state-changing request authenticated by the cookie, with a cross-origin `Origin` (or neither a same-origin `Origin` nor `Sec-Fetch-Site: same-origin`), returns 403. Bearer requests are unaffected.
  - **Verify:** API tests (P5-11).

- [ ] **P5-09 Open redirect**
  - **Goal:** `?next=` can only point at this site.
  - **Files:** `src/lib/redirect.ts`, `src/actions/auth.ts`
  - **Acceptance criteria:** `safeNext` resolves the value against a fixed origin and keeps only same-origin `pathname + search`. It rejects `//x`, `/\x`, control characters and absolute URLs.
  - **Verify:** unit tests (P5-11).

- [ ] **P5-10 Input and upload hardening**
  - **Goal:** no oversized input, and no spoofed file type.
  - **Files:** `src/lib/validation.ts`, `src/lib/services/credentials.ts`, `src/lib/storage.ts`, `src/lib/storage-config.ts`, `src/app/api/credentials/route.ts`, `scripts/storage-setup.ts`
  - **Acceptance criteria:**
    - Free-text fields have length caps (email 254, password 128).
    - Uploads are checked by their magic bytes (PDF, JPEG or PNG), and the detected type is what gets stored.
    - Stored file names are clipped.
    - An upload whose DB write fails is removed from Storage.
    - The API rejects an oversized `Content-Length` before parsing the body.
    - `storage.ts` is `server-only`.
  - **Verify:** API tests (P5-11).

- [ ] **P5-11 Misuse test suite**
  - **Goal:** each control above is proven by a test that attempts the attack.
  - **Files:** `tests/api/security.test.ts`, `tests/e2e/auth.spec.ts`
  - **Acceptance criteria:**
    - **Tokens:** tampered, `alg: none`, expired, wrong `aud`, and a malformed cookie each get 401, never 500.
    - **Logout:** a token reused after logout gets 401.
    - **Access control:** a wrong role or another agency gets 403, and another user's notification gets 404.
    - **Throttling:** the 6th bad password gets 429, and other accounts are unaffected.
    - **CSRF:** a cross-origin cookie POST gets 403, while Bearer works.
    - **Uploads:** a spoofed PDF gets 400.
    - **Validation:** an oversized field gets 400.
    - **Open redirect:** unit cases for `safeNext`.
    - **E2E:** asserts the security headers on `/login`.
  - **Verify:** `npm run test:api`, `npm run test:e2e`.

- [ ] **P5-12 Docs**
  - **Goal:** reviewers can see the security controls and re-run the checks.
  - **Files:** `README.md`, `AGENTS.md`, `spec/tasks/README.md`
  - **Acceptance criteria:**
    - The README "Security" section lists the controls, the `security:sast` and `security:audit` commands, CodeQL, and the accepted risks.
    - AGENTS.md lists the new commands.
    - The status board is updated.
  - **Verify:** read-through.

## Definition of done

- All tasks ticked. `type-check`, `lint`, `test:api`, `test:e2e`, `security:audit` and `security:sast` pass.
- CI green (`check`, `test`, `gitleaks`, `semgrep`, CodeQL). The new migration is applied in production, and the live site sends the headers.

## Notes

_Record decisions made during this phase here._
