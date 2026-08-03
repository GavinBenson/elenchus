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

## Fixed — found in final whole-branch review (2026-07-29)

### Critical

1. **Auth bypass via forwarded headers** — `src/proxy.ts` did not strip
   client-supplied `x-user-id`/`x-user-permissions` headers when no valid
   session existed. Every route derives identity solely from these headers,
   so a request with no cookie but forged headers got full access,
   including admin.
   **Fix:** always delete both headers from the forwarded request first,
   then conditionally re-set them only from a resolved session; both
   branches return `NextResponse.next({ request: { headers } })`. Commit
   `7a74cbc`.
   **Verification:** regression test in `src/proxy.test.ts` asserts on
   `x-middleware-override-headers` (the actual Next.js header-override
   mechanism, verified against `node_modules/next` source), not just
   presence/absence of `x-middleware-request-*` — the first version of this
   test was vacuous (would pass against the original bug too) and was
   rewritten in commit `c1d7705` after the final reviewer caught it.
   Implementer also manually reverted the fix locally, confirmed the test
   fails against the bug, then restored the fix.

2. **Unguarded UI pages** — `/employees`, `/employees/[id]`,
   `/job-postings`, `/job-postings/[id]`, `/admin/roles` had no auth/
   permission check (only `/dashboard` did). `proxy.ts`'s matcher only
   covers `/api/*`, not page routes. Anyone could view employee roster,
   applicant pipeline, and the full role/permission matrix while logged
   out. Violated design spec's "admin-only" requirement for `/admin/roles`.
   **Fix:** all five pages now check the session cookie via `verifySession`
   and `redirect('/login')` if absent, before any data fetch;
   `admin/roles` additionally checks `manage_roles` and redirects to
   `/dashboard` if missing. Commit `f32dc24`.
   **Follow-up fix:** `/employees` and `/employees/[id]` initially still
   bypassed the API's `view_all_employees` permission gate (any
   authenticated user could browse the roster via the UI even though the
   API would 403 them) — closed in commit `44d32a4` by adding the same
   permission check used in `admin/roles`.

### Important

3. **Uncaught Prisma errors leak raw 500s** — DELETE on a record with a
   restrictive FK (e.g. deleting a job posting with applicants, or an
   employee who is someone's manager) threw `P2003`, uncaught, breaking
   the `{ error: { code, message } }` contract Epic 2 asserts against.
   **Fix:** new `toErrorResponse()` helper in `src/lib/errors.ts` maps
   `P2003`→400 `invalid_reference`, `P2025`→404 `not_found`, anything
   else→500 `internal_error` (no leaked detail); wired into every resource
   route's catch block, including previously-unguarded GET/DELETE
   handlers. Commits `2acd24e`, `b13876f`, `24aac0e`.
   **Known residual gap:** `api/auth/me`, `api/auth/login` (partially —
   the two `db` calls after body parsing), and `api/test/reset` still have
   unguarded Prisma calls — flagged by final review as low-severity (not
   attacker-triggerable P2003/P2025 paths) and deferred, not yet fixed.

4. **`view_all_employees` permission was dead** — seeded and granted to
   admin/manager but never checked anywhere; `GET /api/employees` was open
   to any authenticated user regardless of permission.
   **Fix:** `GET /api/employees` now requires it; test added covering 401/
   403/200. Commit `b13876f`.

5. **`PATCH /api/applicants/{id}` was missing** — design spec lists
   `GET/PATCH/DELETE /api/applicants/:id`; only GET/DELETE existed.
   **Fix:** added, updates `name`/`email`/`resumeUrl` only (stage stays
   exclusive to `PATCH /api/applicants/:id/stage`), gated on
   `edit_job_postings` to match POST's permission. Commit `24aac0e`.

6. **Vercel build would fail** — `src/generated/prisma` is gitignored and
   nothing ran `prisma generate` on install/build.
   **Fix:** added `"postinstall": "prisma generate"` to `package.json`.
   Commit `a3dc4b9`.

7. **Hardcoded JWT fallback secret** — `src/lib/auth.ts` fell back to a
   literal string if `JWT_SECRET` was unset, and that literal was public
   in this repo.
   **Fix:** throws at module load if `JWT_SECRET` is unset AND
   `NODE_ENV === 'production'`; dev/test fallback preserved otherwise (so
   local dev and the test suite don't require env setup). Commit `a3dc4b9`.

8. **`dotenv` used but not declared** — relied on as a transitive
   dependency in `prisma.config.ts`/`vitest.config.ts`.
   **Fix:** added `dotenv@^17.4.2` to `devDependencies`. Commit `a3dc4b9`.

9. **Zero test coverage on `src/proxy.ts`** — the exact file that hid
   defect #1 for the whole build.
   **Fix:** `src/proxy.test.ts` added covering no-session, forged-header
   (regression for #1), invalid-cookie-with-forged-headers, and
   valid-session cases. Commit `7a74cbc`, strengthened in `c1d7705` (see
   #1's verification note — the first version was insufficiently rigorous).

### Minor — not yet fixed

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
- No test coverage on the new UI-page permission guards (page components
  aren't tested anywhere in the suite yet).
- `PATCH /api/applicants/{id}` accepts an empty body `{}` and no-ops to
  200 instead of requiring at least one field.
- A JWT for a since-deleted user still produces a valid `x-user-id`
  header (empty permission set), so routes gated on `userId` alone still
  admit it. Pre-existing, not introduced by this fix wave.

## Epic 6 — PBIs 6.1 & 6.2 (data foundation), 2026-07-31

Found and fixed on branch `epic-6-data-foundation` before merge:

- **The seed was not deterministic, three times over, and the test that
  existed to prove determinism could not detect any of it.** Each defect was
  the same class — a column the seed wrote that `snapshot()` omitted:
  `JobPosting.createdAt` (`@default(now())`, never set), then
  `User.createdAt` (same, and the snapshot had no users collection at all),
  then `User.passwordHash` (bcrypt generates a random salt per call). Each
  was caught by a later review round, not by the test suite. Fixed by
  seeding every `@default(now())` column explicitly, precomputing the bcrypt
  hash as a constant, and projecting every non-`id` column the seed writes.
- **`npm test` would wipe whatever `DATABASE_URL` pointed at**, unguarded —
  `prisma/seed.test.ts` reseeds in `beforeAll` and `runSeed()` opens with
  eight unconditional `deleteMany()` calls. Now throws on
  `NODE_ENV === 'production'`, matching the `/api/test/reset` convention.
- **A no-op stage PATCH reset `stageChangedAt`**, zeroing days-in-stage when
  someone re-selected an applicant's current stage. Now preserved when
  `existing.stage === body.stage`.
- **`src/app/api/applicants/stage.test.ts` could not run standalone** — it
  depended on `prisma/seed.test.ts` running first to create the user it
  looks up. Now self-seeds.
- **The day anchor was memoised per process rather than per seed run.**
  Introduced while fixing a midnight-rollover inconsistency; because
  `/api/test/reset` calls `runSeed()` inside a long-lived server, a server
  booted Monday would reseed Friday with Monday's anchor, silently breaking
  the "applied today" invariant. Rescoped to per-run.

### Carried tech debt — not fixed, tracked for follow-up

- **There is no separate test database.** Every test file runs against
  `DATABASE_URL`, and `prisma/seed.test.ts` wipes and reseeds it mid-suite.
  This corrupted concurrently-running test files, making `npm test` fail
  differently on every run; mitigated with `fileParallelism: false` in
  `vitest.config.ts`, which serialises test files. That is a mitigation, not
  a cure — a running dev server, a manual `prisma db seed`, or two
  concurrent `npm test` invocations can still corrupt a run, and every new
  test file is now implicitly order-dependent around the reseed. **The real
  fix is a dedicated test `DATABASE_URL` (or per-test transaction
  rollback), and it should land before Epic 2's Playwright suite adds more
  database-touching tests.** This is the top follow-up item for Epic 6.
- The destructive-seed guard keys on `NODE_ENV`; an unset `NODE_ENV` in a
  deployment gets no protection. A positive opt-in flag would be safer.
- Rotating the fixture password now requires regenerating the bcrypt
  constant by hand. The `bcrypt.compare` assertion prevents silent rot but
  there is no script.
- `prisma/seed-data/employees.ts` has `Grace O’Sullivan` with a curly
  apostrophe (U+2019), commented as a deliberate Unicode edge case. Name
  search in PBIs 6.6 / 6.10 must not exact-match a straight apostrophe.
  **Addressed for applicant search in 6.6** (`applicantWhere` searches both
  apostrophe spellings); still open for employee search in 6.10, which is
  where the actual curly-apostrophe record lives.

## Epic 6 — PBI 6.6 (applicants list), 2026-08-02

- **Sorting the list purely by oldest-time-in-stage buried the actionable
  rows.** The first implementation ordered by `stageChangedAt` ascending in
  SQL, which put 40-day-old rejected and hired records at the top and pushed
  the aging offers — the only rows carrying a deadline — down the page. Caught
  by looking at the rendered screen, not by any test. Replaced with
  `sortForReview()`: aging offers first (longest-outstanding first), then
  everything else by most recent activity. Done in memory because "aging" is a
  function of the request's clock rather than a stored column.

### Found, not fixed — deferred with a reason

- **The app shell does not collapse at mobile widths.** Found while verifying
  6.6 at 390px: `src/app/(app)/layout.tsx` renders the sidebar as a permanent
  flex child with no responsive treatment, so the main region is squeezed to
  roughly 165px, the table clips, and the page body scrolls horizontally. Not
  introduced by 6.6 — it is a PBI 6.5 shell gap that only became visible once a
  screen had real content in it. Fixing it means designing a mobile nav
  affordance (off-canvas drawer or a collapsed icon rail), which is a shell
  decision rather than a list-screen one, so it is deferred to **PBI 6.15**,
  whose acceptance criteria already include "no horizontal scroll or broken
  layout at mobile widths". Every screen PBI between here and 6.15 inherits
  the same defect.
