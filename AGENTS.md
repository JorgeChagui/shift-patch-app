# ShiftPatch

Nursing shift marketplace built for a technical assessment. Agencies post open shifts, nurses browse and claim them (blocked if credentials are expired), and admins monitor everything in real time.

**Source of truth:** `spec/ShiftPatch-Technical-Spec.md` (API contracts, sample data, required `data-testid`s) and `spec/raw-requirements.md` (scope). Routes, response shapes, seed data and test IDs must match the spec **exactly**. Update the spec before changing behaviour.

## Project status

Work is split into 4 phases in `spec/tasks/` (the development spec, derived from `spec/`). `spec/tasks/README.md` holds the status board and the cross-phase decisions that fill gaps in the spec; read it first.

- Current phase: **Phase 1 — DB & Seed Data** (`spec/tasks/phase-1-db-seed.md`)
- Plan each phase from its task file. Tick tasks (`- [x]`) as they land, and update the status board and this "Current phase" line in the same commit.

## Stack and decisions

- Next.js 16 (App Router, TypeScript), Tailwind CSS v4, shadcn/ui
- Prisma + Supabase PostgreSQL (pooled URL on port 6543 at runtime, `DIRECT_URL` on 5432 for migrations)
- Auth: custom, `bcryptjs` + `jose` JWT. `Authorization: Bearer <token>` for the API, httpOnly cookie for the UI. One `getSession()` helper shared by route handlers and `proxy.ts` (Next 16 renamed `middleware.ts`).
- Validation: `zod` on every request body and param
- Real-time admin dashboard: SSE from a route handler, with client polling as the fallback. Don't rely on an in-memory emitter (serverless); read changes from the DB.
- Credential files: Supabase Storage (private bucket, server-side service-role key, signed URLs)
- Tests: Vitest (API) and Playwright (E2E). CI via GitHub Actions, deploy on Vercel.

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run type-check   # next typegen + tsc --noEmit
npm run lint         # eslint .
npm run test:api     # vitest run (tests/api)
npm run test:e2e     # playwright test (tests/e2e)
```

## Layout

- `src/app` routes (route groups `(nurse)`, `(agency)`, `(admin)`), `src/app/api` route handlers
- `src/lib` db client, auth, validation, shared helpers
- `tests/api`, `tests/e2e`
- `spec/` requirements, `spec/tasks/` phased development tasks, `.claude/skills/` project skills

## Rules

- Error responses are always `{ "error": "<message>" }`.
- Enforce role checks server-side in every handler; never trust the UI.
- Every state change writes an audit log entry.
- Keep `date`, `startTime`, `endTime` as strings (`YYYY-MM-DD`, `HH:mm`, facility-local); overnight shifts end the next day.
- Never commit secrets. Only `.env.example` is tracked.
- Before declaring work done, run `type-check`, `lint`, `test:api` and `test:e2e`.

## Skills (`.claude/skills/`)

`next-best-practices`, `frontend-design`, `spec-driven-development` (installed with `npx skills add`, locked in `skills-lock.json`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
