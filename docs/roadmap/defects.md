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

- **There was no separate test database.** Every test file ran against
  `DATABASE_URL`, and `prisma/seed.test.ts` wipes and reseeds it mid-suite.
  This corrupted concurrently-running test files, making `npm test` fail
  differently on every run; mitigated with `fileParallelism: false` in
  `vitest.config.ts`, which serialises test files. That was a mitigation, not
  a cure — a running dev server or a manual `prisma db seed` could still
  corrupt a run.
  **Partly fixed (2026-08-02, before PBI 6.6):** `TEST_DATABASE_URL` now
  exists. `vitest.config.ts` overrides `DATABASE_URL` with it for the whole
  run via `test.env`, so the destructive suite no longer touches the app
  database. `src/test/setup.ts` throws if `TEST_DATABASE_URL` is set but the
  override did not take, so the isolation cannot silently lapse. Verified
  non-vacuously: with `TEST_DATABASE_URL` pointed at a bogus host, Prisma
  reports it cannot reach that host — proving the value reaches the client
  rather than merely being read.
  **Residual:** when `TEST_DATABASE_URL` is unset the suite still falls back
  to `DATABASE_URL` and destroys it (loud warning, not a hard failure — a
  fresh checkout stays runnable). And this isolates the suite from the app,
  not test files from each other: they still share one database within a
  run, so `fileParallelism: false` stays, and every test file remains
  implicitly order-dependent around the reseed. Per-test transaction
  rollback is still the full cure, and matters more once Epic 2's Playwright
  suite lands.
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

- **A stage picked while the search was still debouncing was silently
  reverted.** Found in review of the 6.6 branch before merge. The debounce
  effect is keyed on `[query, filters.query]`, but the `navigate` it schedules
  also read `filters.stage` and `filters.postingId` through its closure. Change
  a filter inside the 250ms window and the effect does not re-run, so the
  pending timer fires with the filters as they were before the change and drops
  it. Fixed by reading the other filters through a ref, so the timer always
  sees current values without the search re-firing on every filter change.
  Regression test added and confirmed non-vacuous: reverting to the closure
  read fails that test and only that test.

### Found, not fixed — deferred with a reason (6.6)

- **The app shell does not collapse at mobile widths.** Found while verifying
  6.6 at 390px: `src/app/(app)/layout.tsx` renders the sidebar as a permanent
  flex child with no responsive treatment, so the main region is squeezed to
  roughly 165px, the table clips, and the page body scrolls horizontally. Not
  introduced by 6.6 — it is a PBI 6.5 shell gap that only became visible once a
  screen had real content in it. Fixing it means designing a mobile nav
  affordance (off-canvas drawer or a collapsed icon rail), which is a shell
  decision rather than a list-screen one.
  **Promoted to its own PBI (2026-08-02):** originally deferred into the
  consistency sweep, but a sweep that also has to design the navigation is not
  a sweep, and every screen inherits whatever affordance is chosen. It is now
  **PBI 6.15 — Responsive app shell**, with the sweep renumbered to 6.16.
  Every screen PBI built between 6.6 and 6.15 inherits the defect until then.

## Epic 6 — PBI 6.7 (pipeline board), 2026-08-02

Both defects below were found by driving the real browser, and neither could
have been caught by the component tests as written — they are failures of the
drag library's contract, not of this app's state machine.

- **Keyboard dragging did not work, while appearing to.** `useSensor(KeyboardSensor)`
  with dnd-kit's default coordinate getter nudges the dragged card 25px per key
  press. Board columns are ~240px wide, so moving a card one column took about
  ten presses and the first press looked like nothing had happened — which is
  what "keyboard dragging works" degrades into if you accept the default. Fixed
  with `boardKeyboardCoordinates`, which steps a whole column per press,
  clamped at both ends rather than wrapping. Verified against a live browser:
  one `ArrowRight` now announces `moved over droppable area interview`.
- **The first fix was silently a no-op: wrong coordinate space.** dnd-kit's
  `KeyboardCoordinateGetter` returns the drag's accumulated *translate*, not a
  position on the page. The first version returned the target column's absolute
  centre, so the card shifted a few pixels and stayed over its original column.
  Every unit test passed, because they asserted against the same wrong model
  the implementation used — the assertion and the bug agreed with each other.
  Caught only by pressing the key in a real browser and reading the live-region
  announcement. The test file now names the two spaces explicitly and covers a
  mid-drag press where a page position and a translate give different answers.

Verification note: the successful keyboard drop was confirmed end to end —
optimistic move, `PATCH /api/applicants/:id/stage`, and the persisted
`stage`/`stageChangedAt` read back from the API — then the seed was restored.

## Epic 6 — PBI 6.8 (applicant detail), 2026-08-02

- **The stage timeline claimed an applicant was still in a stage they had
  left.** Every entry rendered "Nd in this stage", including the Applied entry
  of someone who had since moved to Offer — so the screen said both "33d in
  this stage (Applied)" and "11d in this stage (Offer)" at once. Only the last
  non-terminal entry is a stage the applicant is currently in; earlier entries
  now read "Nd ago". Found by reading the rendered screen.
- **Stage names appeared lowercase mid-sentence** ("Moved to offer") because
  the raw database value was interpolated. Now mapped through display labels,
  as everywhere else in the UI.

### Known limitation — recorded, not a defect

The timeline is honestly two points: `appliedAt` and `stageChangedAt`. The
schema stores no per-transition history, so the stages in between cannot be
shown without inventing them, and the screen says so in as many words rather
than implying a full history. A real history needs a `StageEvent` table written
on every transition — a data-model change rather than a screen change, so it is
out of scope here and worth its own PBI if the pipeline analytics in Epic 4
need it.

## Epic 6 — PBI 6.9 (job postings), 2026-08-02

- **Closed postings sorted to the top of the list, above every open role.**
  The query ordered by `status: 'asc'`, and the status column is a free string
  — `"closed"` sorts before `"open"` alphabetically, so the SQL did the exact
  opposite of what its own comment claimed. Found by looking at the rendered
  list, where the one closed role sat above six open ones. Now partitioned in
  memory, open first, with the reason stated at the call site so the next
  person does not "simplify" it back into an `orderBy`.

## Epic 6 — PBI 6.10 (employees), 2026-08-02

- **A terminated employee's detail page stated a length of service that was
  not true.** The page rendered "Tenure at departure: 4 years, 5 months", but
  the schema records no termination date — the figure was measured from hire
  date to *today*, so it kept growing after the person had left. Caught by
  reading the rendered page for a seeded terminated employee. The field now
  reads "No end date recorded" for departed staff rather than inventing a
  departure tenure. Adding `Employee.terminatedAt` would fix it properly and
  is a data-model change, so it is out of scope here.
- **A naive name sort would have put `Grace O’Sullivan` after every ASCII
  surname.** The seed carries that name with U+2019 as a deliberate Unicode
  edge case, and `a.name < b.name` compares code points, so it sorts after
  `Zylberberg`. The roster sorts through `Intl.Collator` instead, with a test
  covering exactly that ordering. This closes the employee half of the
  apostrophe item carried from the 6.1/6.2 review; the applicant-search half
  was closed in 6.6.

## Epic 6 — PBI 6.11 (admin and recruiter dashboards), 2026-08-02

- **The test-ID contract test caught a real regression, exactly as designed.**
  `StatTile` first took the legacy ids (`stat-employee-count` and the other
  two) through a `valueTestId` prop. They still reached the DOM, so the screen
  worked — but `testid-contract.test.ts` scans source for the literal
  `data-testid="..."` attribute and could no longer see them, and any future
  refactor could have dropped them silently. Fixed by making `StatTile.value`
  a node so the id is authored at the call site, which is the rule the design
  doc already states: no primitive invents or hides a test id. Worth recording
  because this is the first time the contract test has failed on a real change
  rather than on a false positive.
- **`stat-posting-count` was nearly repointed at a subset.** The natural
  headline for that tile is "open roles", but the id has meant "how many job
  postings exist" since Epic 1. It now sits on the total with open roles as the
  hint; changing what an existing assertion measures is a silent contract
  break even when every test still passes.

## Epic 6 — PBI 6.12 (manager and employee dashboards), 2026-08-02

### Found, not fixed — needs a product decision

- **Candidate PII is visible to every authenticated user, including roles with
  zero permissions.** Noticed while building the employee dashboard, which had
  to be assembled only from things an employee is entitled to. Logged in as
  `employee@elenchus.test` (the `employee` role is seeded with an empty
  permission set), `/applicants` renders all 46 candidates with names, email
  addresses, stages, and days-in-stage; `/applicants/{id}` and
  `/job-postings/{id}` are equally open. Both page routes and the underlying
  `GET /api/applicants` gate on `requireSession` alone, so this is by
  construction rather than by a bug in a screen.

  Real ATS products do not do this — candidate data is normally restricted to
  recruiters and hiring managers on the specific requisition. Compare
  `/employees`, which correctly requires `view_all_employees`, and note that
  `view_all_employees` was itself found dead in the Epic 1 review for the same
  class of reason.

  **Not fixed here.** A screen PBI is the wrong place to change an
  authorisation boundary: it would alter documented API behaviour, need the
  OpenAPI spec updated, and break any Epic 2 test written against today's
  rules. It needs a deliberate decision about which roles may see candidates,
  and probably a new permission key such as `view_applicants`, granted to
  admin and recruiter — and to manager only if hiring managers are meant to
  see their own requisitions.

### Verification note

The sign-out button appeared broken during this PBI's browser checks — clicking
it left the session valid and the URL unchanged. It is not broken: the handler
awaits `POST /api/auth/logout` before `router.push`, and the assertions were
being read before that round trip finished. Given ~1.5s it lands on `/login`
with `GET /api/auth/me` returning 401. Recorded because "the fix I was about to
make" would have been to a component that was already correct.

## Epic 6 — PBI 6.13 (login), 2026-08-02

- **A failed sign-in could throw a second, uglier error on top of the first.**
  The handler read `body.error.message` straight off the parsed response, so
  any failure that did not return the standard `{ error: { code, message } }`
  envelope — a proxy error page, a 502, anything non-JSON — threw a
  `TypeError` inside the submit handler instead of showing the user a message.
  Now parses defensively and falls back to the status code. Regression test
  covers a failure body that is not the expected shape.

## Epic 6 — PBI 6.14 (roles matrix), 2026-08-03

### Found, not fixed — belongs with Epic 7

- **Moving an applicant between pipeline stages requires `delete_applicant`.**
  `PATCH /api/applicants/{id}/stage` gates on that key, so the most routine
  action in an ATS sits behind the most destructive-sounding permission in the
  system. Found while writing accurate descriptions for the matrix: every
  description was derived by grepping for the key that gates it, which is what
  made the mismatch visible.

  The consequence is visible in the matrix itself. `manager` holds
  `edit_job_postings` and `view_all_employees` but not `delete_applicant`, so a
  hiring manager cannot advance a candidate they are interviewing — while
  anyone who *can* advance a candidate can also delete one outright. Neither
  half of that is what the names imply.

  Not fixed here for the same reason as the candidate-visibility gap: it is an
  authorization change needing a new key (`move_applicant_stage` or similar),
  a seed change, an OpenAPI update, and new tests, and Epic 2 will otherwise
  be written against the current rules. Belongs in **Epic 7** alongside PBI 7.1.

  The matrix documents the behaviour rather than hiding it — the caveat is
  rendered on screen in the warn colour, and a test asserts the caveat
  mentions stage changes, so if the API is ever corrected the test fails and
  the note is removed with it.

## Epic 6 — PBI 6.15 (responsive app shell), 2026-08-03

- **The shell defect carried since 6.6 is fixed.** Below `lg` the sidebar is
  now an off-canvas drawer behind a menu button; at `lg` and above it is the
  same static rail as before, unchanged. One `<nav>` instance serves both, so
  no selector matches twice.
- **`sr-only` inside a horizontal scroll container widened the whole page.**
  Found while sweeping routes at 390px: `/admin/roles` still scrolled
  horizontally by 144px even though the table's `overflow-x-auto` wrapper was
  containing the table correctly (342px visible, 618px scrollable), and no
  element's bounding box exceeded the viewport outside a scroll container.
  Bisected by hiding elements one at a time until the overflow disappeared.

  Cause: Tailwind's `sr-only` is `position: absolute`, and the matrix cells had
  no positioned ancestor — so each hidden "granted"/"not granted" label's
  containing block was the document, not the scrolling wrapper. Labels in
  columns past the fold sat at x=519 and the page grew to match. The scroll
  container could not clip them because it was never in their containing-block
  chain.

  Fixed by adding `relative` to the cell badge. The comment at the call site
  says why, because it looks like a decorative class and would be an easy
  "cleanup" for someone later. This is the only `sr-only` inside a scroll
  container in the codebase — checked.
- **A `setState` inside an effect keyed on the pathname was closing the
  drawer.** Lint rejected it as a cascading render, correctly: navigating is an
  event, not something to observe after the fact. The drawer now closes in the
  nav link's own `onClick`.
- **jsdom has no `window.matchMedia`,** which the drawer needs to know which
  side of the breakpoint it is on, and adding it broke all six pre-existing
  sidebar tests. Stubbed in `src/test/setup.ts` rather than guarded around in
  component code: every browser since IE10 has `matchMedia`, so the test
  environment is the deficient one and production code should not carry a
  branch that never executes there.
