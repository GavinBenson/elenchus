# Defects Backlog

Bugs found during review (per-task and final whole-branch), tracked here for
portfolio traceability — shows real QA process: found, triaged, fixed,
verified. See [backlog.md](backlog.md) for feature PBIs.

## Fixed during Epic 1 (per-task review cycles)

- **Login 500 on malformed JSON body** (Task 4) — `request.json()` uncaught
  parse failure. Fixed: wrapped in try/catch, returns 400. Commit `df8be72`.
- **PATCH/DELETE 500 instead of 404 on missing record** (Task 6, propagated
  fix into Tasks 7-8 plan text) — Prisma throws on update/delete against a
  nonexistent id; routes didn't check existence first. Fixed across
  employees, job-postings, applicants. Commits `eb5e30f`, `b637c88`(brief),
  `8661fec`.
- **Missing regression test coverage for security-relevant paths** (Tasks
  6, 7, 9) — 404 paths and admin-gate paths shipped without tests proving
  the behavior, risking silent regression. Fixed: added tests in each case.

## Open — found in final whole-branch review (2026-07-29)

### Critical

1. **Auth bypass via forwarded headers** — `src/proxy.ts` does not strip
   client-supplied `x-user-id`/`x-user-permissions` headers when no valid
   session exists. Every route derives identity solely from these headers,
   so a request with no cookie but forged headers gets full access,
   including admin. Fix: delete both headers from the forwarded request
   unconditionally before the session check.

2. **Unguarded UI pages** — `/employees`, `/employees/[id]`,
   `/job-postings`, `/job-postings/[id]`, `/admin/roles` have no auth/
   permission check (only `/dashboard` does). `proxy.ts`'s matcher only
   covers `/api/*`, not page routes. Anyone can view employee roster,
   applicant pipeline, and the full role/permission matrix while logged
   out. Violates design spec's "admin-only" requirement for `/admin/roles`.

### Important

3. **Uncaught Prisma errors leak raw 500s** — DELETE on a record with a
   restrictive FK (e.g. deleting a job posting with applicants, or an
   employee who is someone's manager) throws `P2003`, uncaught, breaking
   the `{ error: { code, message } }` contract Epic 2 will assert against.
   Also applies to POST with an invalid foreign key (`jobPostingId`,
   `managerId`, `userId`).

4. **`view_all_employees` permission is dead** — seeded and granted to
   admin/manager but never checked anywhere; `GET /api/employees` is open
   to any authenticated user regardless of permission.

5. **`PATCH /api/employees/... /applicants/{id}` missing** — design spec
   lists `GET/PATCH/DELETE /api/applicants/:id`; only GET/DELETE exist.
   Undocumented deviation.

6. **Vercel build will fail** — `src/generated/prisma` is gitignored and
   nothing runs `prisma generate` on install/build. Need a `postinstall`
   script.

7. **Hardcoded JWT fallback secret** — `src/lib/auth.ts` falls back to a
   literal string if `JWT_SECRET` is unset. That literal is now public in
   this repo. Should throw in production instead of falling back.

8. **`dotenv` used but not declared** — relied on as a transitive
   dependency in `prisma.config.ts`/`vitest.config.ts`.

9. **Zero test coverage on `src/proxy.ts`** — the exact file that hid
   defect #1 for the whole build. No test proves headers are actually
   stripped/set correctly by the real request pipeline.

### Minor

- Boilerplate `create-next-app` content untouched (`README.md`,
  `src/app/page.tsx`, `<title>` in layout).
- Session cookie missing `Secure` flag (fine on localhost, wrong on
  Vercel/HTTPS).
- `src/lib/validation.ts` unused `z` import; zod 3 vs zod 4 API spelling
  drift (`z.string().email()` vs `z.email()`).
- `test/reset` route imports `prisma/seed.ts` directly, instantiating a
  second `PrismaClient` outside the `db.ts` singleton.
- `auth/me` reads the cookie directly instead of proxy headers (defensible
  but inconsistent with the rest of the codebase — undocumented).
- Stage-transition PATCH validates body before existence check; other
  PATCH routes check existence first. Inconsistent precedence, both valid,
  should be a documented decision.
- `/employees` design says "list + detail/edit"; no edit UI was built
  (API-only).
