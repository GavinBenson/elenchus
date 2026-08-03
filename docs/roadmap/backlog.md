# Backlog

PBIs per epic. See [roadmap](../superpowers/specs/2026-07-29-roadmap-design.md)
for epic overview, and each epic's design doc for architectural detail.

## Epic 1 — Mock Application [DONE — 2026-07-29]

Design: [2026-07-29-epic1-mock-app-design.md](../superpowers/specs/2026-07-29-epic1-mock-app-design.md)
Implementation plan: [2026-07-29-epic1-mock-app.md](../superpowers/plans/2026-07-29-epic1-mock-app.md)

All 12 plan tasks implemented, reviewed, and merged to main. Several bugs
were found and fixed along the way (per-task review + a final whole-branch
review that caught a Critical auth bypass and unguarded UI pages before
merge) — see [defects.md](defects.md) for the full list with fix commits.

### PBI 1.1 — [DONE] Project scaffold
**Description:** Initialize Next.js (App Router) + TypeScript project. Set up
Prisma with Neon Postgres connection. Configure Tailwind, ESLint, Zod.
**Acceptance criteria:**
- `npm run dev` serves a blank Next.js app
- Prisma connects to Neon and can run `migrate dev`
- Lint passes on a clean checkout

### PBI 1.2 — [DONE] Data model & migrations
**Description:** Implement Prisma schema: User, Role, Permission,
RolePermission, UserPermissionOverride, Employee, JobPosting, Applicant.
**Acceptance criteria:**
- Schema matches design doc's data model section
- Migration runs cleanly against Neon
- Self-referential `Employee.managerId` relation works (query an employee's
  reports)

### PBI 1.3 — [DONE] Auth (login/logout/session)
**Description:** JWT-in-httpOnly-cookie auth. `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/auth/me`. Bcrypt password hashing.
**Acceptance criteria:**
- Valid credentials return a session cookie; `GET /api/auth/me` reflects
  logged-in user
- Invalid credentials return 401 with standard error shape
- Logout clears the session cookie

### PBI 1.4 — [DONE] Permission engine
**Description:** `hasPermission(user, key)` resolving effective permissions
from Role bundle + UserPermissionOverride. Middleware attaches resolved
permissions to request context.
**Acceptance criteria:**
- A permission granted via Role passes `hasPermission`
- A permission revoked via override on a role that grants it fails
  `hasPermission`
- A permission granted via override on a role that lacks it passes
  `hasPermission`

### PBI 1.5 — [DONE] Employees API
**Description:** `GET/POST /api/employees`, `GET/PATCH/DELETE /api/employees/:id`,
permission-gated.
**Acceptance criteria:**
- Authorized role can perform each operation; unauthorized gets 403
- Unauthenticated request gets 401
- Invalid payload gets 400 with field-level Zod errors

### PBI 1.6 — [DONE] Job Postings API
**Description:** `GET/POST /api/job-postings`, `GET/PATCH/DELETE /api/job-postings/:id`,
permission-gated.
**Acceptance criteria:** same shape as PBI 1.5, scoped to job postings.

### PBI 1.7 — [DONE] Applicants API
**Description:** `GET/POST /api/applicants`, `GET/PATCH/DELETE /api/applicants/:id`,
`PATCH /api/applicants/:id/stage`.
**Acceptance criteria:**
- Stage transitions (applied -> interview -> offer -> hired/rejected) persist
  correctly
- Same auth/validation shape as other resource APIs

### PBI 1.8 — [DONE] Roles & Permissions admin API
**Description:** `GET/POST /api/roles`, `GET/POST /api/permissions`,
admin-only.
**Acceptance criteria:**
- Non-admin gets 403 on all these routes
- Admin can create a role, attach permissions, and see it reflected in
  `hasPermission` checks for a user with that role

### PBI 1.9 — [DONE] Seed script & test-reset endpoint
**Description:** `prisma/seed.ts` with deterministic fixture data (fixed
users per role, postings, applicants). `POST /api/test/reset`, gated to
non-prod, restores seed state.
**Acceptance criteria:**
- Running seed script twice yields identical fixture state
- `/api/test/reset` is unreachable when `NODE_ENV=production`
- Calling reset mid-test restores known state (no leftover test data)

### PBI 1.10 — [DONE] UI pages
**Description:** `/login`, `/dashboard` (role-aware), `/employees`,
`/job-postings` (with pipeline view), `/admin/roles`. `data-testid` on
interactive elements.
**Acceptance criteria:**
- Each role sees the dashboard variant described in the design doc
- All interactive elements (forms, buttons, nav) carry stable `data-testid`
- Pages render only data the logged-in user is permitted to see

### PBI 1.11 — [DONE] OpenAPI spec
**Description:** Maintain an OpenAPI spec describing all `/api/*` routes,
kept in sync as routes are built.
**Acceptance criteria:**
- Spec covers every route in PBIs 1.3, 1.5-1.8
- Spec validates against the OpenAPI schema (lint/validate step)

## Epic 2 — Playwright Test Suite

PBIs to be written after Epic 1 brainstorming/implementation, once real
interfaces exist to test against.

## Epic 3 — CI Pipeline

PBIs pending, with one already written because it constrains how the pipeline
is built.

### PBI 3.x — Regression proof: a deliberately broken branch CI fails on

**Description:** A green test suite proves nothing on its own — a reader cannot
tell a suite that catches regressions from one that asserts nothing. Maintain a
long-lived branch, `demo/broken-stage-transition`, that is `main` plus one
deliberate, documented defect (e.g. the stage handler stops writing
`stageChangedAt`, or the permission check drops its override lookup). CI runs
on it like any other branch and fails, visibly and repeatably.

The bug lives only on that branch. `main` stays correct — the demo app is also
what a reader clicks through, and a shipped bug reads as incompetence rather
than as a demonstration.

Complements the existing evidence rather than replacing it:
[defects.md](defects.md) already shows found → triaged → fixed → verified,
including two occasions where a test itself was vacuous and had to be
rewritten. This PBI adds the live, re-runnable version of the same claim.

**Depends on:** Epic 2 (Playwright suite) and the rest of Epic 3 — a failing
run is only legible once there is a pipeline UI showing it.

**Acceptance criteria:**
- The branch differs from `main` by exactly one commit, whose message states
  what was broken and why
- CI runs on it automatically and fails; the failing job names the assertion
  that caught the defect
- The failure is a real assertion failure, not a build or lint error
- `README.md` links to the failing run, so the proof is reachable without
  cloning anything
- A documented refresh step keeps the branch rebased on `main`, so the proof
  does not rot into a stale-branch failure that proves nothing

## Epic 4 — Dashboard

PBIs pending.

## Epic 5 — AI Layer

PBIs pending.

## Epic 6 — ATS-Quality UI Polish

Design: [2026-07-31-epic6-ats-ui-polish-design.md](../superpowers/specs/2026-07-31-epic6-ats-ui-polish-design.md)

Added 2026-07-29 after using Epic 1's UI and finding it too bare for the
portfolio narrative ("built a demo ATS using SaaS-ATS expertise"). Brainstormed
and speced 2026-07-31. Runs before or alongside Epic 2, not after — reworking
visual structure post-hoc would relocate `data-testid`s twice.

Visual direction: warm product palette (rust accent on warm off-white)
carrying enterprise-ATS information density. Success bar: click through every
route in every role and find nothing that feels unfinished.

Standalone applicants list/detail with stage control shipped early (PR #3),
since it was needed regardless of visual polish level.

Empty, loading, and error states are acceptance criteria on every screen PBI
below rather than a PBI of their own — no screen is done without them. Every
screen PBI is also verified in both light and dark mode.

### PBI 6.1 — [DONE] `stageChangedAt` field
**Description:** Add `Applicant.stageChangedAt` — Prisma migration, set it in
the `PATCH /api/applicants/:id/stage` handler, update the OpenAPI spec.
**Acceptance criteria:**
- Migration applies cleanly; existing rows get a sensible backfill value
- A stage transition updates `stageChangedAt`; other applicant updates do not
- OpenAPI spec reflects the new field
- Existing stage tests still pass

### PBI 6.2 — [DONE] Seed expansion
**Description:** Append ~40 employees across departments, 6 postings, and 45
applicants spread across the five stages with varied `appliedAt` /
`stageChangedAt`. The four fixture users and their existing records stay
byte-identical.
**Acceptance criteria:**
- Running the seed twice yields identical state (no unseeded randomness)
- The four fixture users and their existing records are unchanged
- Employees include a manager/reports hierarchy more than one level deep
- Applicant distribution across stages is uneven and realistic, including at
  least one offer older than 10 days (to exercise the aging highlight)

### PBI 6.3 — [DONE] Palette and dark mode tokens
**Description:** Replace the create-next-app `globals.css` with the warm
palette as Tailwind v4 `@theme` tokens, plus the dark token set and the
pre-paint script in the root layout. No toggle control yet — that ships with
the sidebar in 6.5.
**Acceptance criteria:**
- Semantic tokens defined (surface, panel, rail, line, ink, ink-muted, accent,
  five stage hues with paired backgrounds) in both light and dark
- The stale `font-family: Arial` override is gone and Geist actually applies
- Forcing `.dark` on `<html>` re-themes the app with no per-component edits
- No light flash on load when dark is the stored or OS preference

### PBI 6.4 — [DONE] UI primitives
**Description:** `src/components/ui/` — `Button`, `Input`, `Select`, `Badge`,
`Card`, `Table` (composable `Table`/`Th`/`Td`), `PageHeader`, `EmptyState`,
`Skeleton`, `Avatar`. Built on 6.3's tokens, no external dependencies.
**Acceptance criteria:**
- Every primitive accepts and forwards `data-testid`
- `Badge` maps each of the five stages to its own variant
- `Avatar` derives deterministic initials and hue from a name
- Component tests cover the above
- Nothing is built that no screen in this epic consumes

### PBI 6.5 — [DONE] App shell
**Description:** `(app)` route group with a sidebar layout, `page-auth.ts`
(`requireSession` / `requirePermission`) replacing per-page auth boilerplate,
permission-filtered nav, dark mode toggle, and the test ID contract test.
**Acceptance criteria:**
- URLs unchanged; every existing `data-testid` still resolves
- Nav links filtered by resolved permissions (no Employees link without
  `view_all_employees`)
- Dark mode toggles from the sidebar, persists, defaults to OS preference
- `requireSession` / `requirePermission` unit-tested across the
  unauthenticated, unpermitted, and success paths
- `testid-contract.test.ts` exists, holds the frozen ID list, and passes
- Existing pages render inside the shell without visual rework yet

### PBI 6.6 — [DONE] Applicants list
**Description:** Port `/applicants` to the design system: table with search,
stage filter, role filter, days-in-stage column, and aging highlight on offers
older than 10 days.
**Acceptance criteria:**
- `applicants-list` and `applicant-row-{id}` still resolve, on the row
  container and rows respectively
- Search and both filters narrow the list; combined filters compose
- Offers aging past 10 days are visually flagged
- Empty, loading, and error states are designed and reachable
- New IDs added: `applicants-search`, `filter-stage`, `filter-role`

### PBI 6.7 — [DONE] Pipeline board
**Description:** Five-column board at `/applicants/board` with dnd-kit
drag-and-drop, optimistic update, and rollback on API failure.
**Acceptance criteria:**
- Dragging a card between columns persists the stage change
- A failed API call rolls the card back and surfaces an error
- Dragging works by keyboard, not only mouse
- The detail-page `StageControl` dropdown still works unchanged
- New IDs added: `board-column-{stage}`, `board-card-{id}`

### PBI 6.8 — [DONE] Applicant detail
**Description:** Two-column detail: candidate summary, stage timeline, linked
posting, resume link. Stage control restyled in place.
**Acceptance criteria:**
- Stage timeline reflects `appliedAt` and `stageChangedAt`
- `applicant-detail`, `applicant-name`, `applicant-email`,
  `applicant-stage`, `applicant-job-posting` all still resolve
- `StageControl` behavior is unchanged; only its styling moves
- Empty, loading, and error states are designed and reachable

### PBI 6.9 — [DONE] Job postings
**Description:** `/job-postings` list and detail adopt the design system.
Detail shows the posting's applicant pipeline with per-stage counts.
**Acceptance criteria:**
- `job-postings-list` and `job-posting-detail` still resolve
- Detail shows applicant counts per stage, linking through to applicants
- Open and closed postings are visually distinguishable
- Permission gating behaves exactly as before
- Empty, loading, and error states are designed and reachable

### PBI 6.10 — [DONE] Employees
**Description:** `/employees` list and detail adopt the design system. Detail
renders the manager/reports hierarchy, which is in the schema but currently
invisible in the UI.
**Acceptance criteria:**
- `employees-list`, `employee-row-{id}`, `employee-detail`, `employee-title`,
  `employee-department`, `employee-status` all still resolve
- An employee's manager and direct reports are visible and navigable
- Terminated employees are visually distinguishable from active
- `view_all_employees` gating behaves exactly as before
- Empty, loading, and error states are designed and reachable

### PBI 6.11 — [DONE] Admin and recruiter dashboards
**Description:** Admin gets the tile row (open roles, active candidates, in
interview, offers out) plus a stage-distribution bar. Recruiter gets open
postings with applicant counts and an aging-offers callout.
**Acceptance criteria:**
- `dashboard-admin` and `dashboard-recruiter` still resolve
- `stat-employee-count`, `stat-posting-count`, `stat-applicant-count` still
  resolve and still report correct numbers
- `recruiter-postings-list` still resolves
- Neither dashboard renders data the user lacks permission to see
- New IDs added: `stat-tile-{key}`

### PBI 6.12 — [DONE] Manager and employee dashboards
**Description:** Manager gets a real reports table. Employee gets a genuine
landing screen rather than the word "Welcome".
**Acceptance criteria:**
- `dashboard-manager`, `dashboard-employee`, `manager-reports-list` all still
  resolve
- The manager reports table links through to employee detail
- The employee variant renders something useful with zero permissions
- A manager with no reports gets a designed empty state

### PBI 6.13 — Login
**Description:** Split-screen login treatment — it is the first screen anyone
sees, and it sits outside the `(app)` shell.
Includes one-click demo sign-in: a reader landing on this app cold should not
have to find credentials to see anything. Four "Sign in as…" buttons (admin,
recruiter, manager, employee) fill the form and submit, rather than prefilling
a single account — same convenience, and it puts the RBAC story on the first
screen, since each role lands on a visibly different dashboard and nav.

The buttons post the seeded fixture credentials, which are already public in
`prisma/seed.ts`, so this exposes nothing that the repository does not. They
are gated to the fixture accounts only and must never become a generic
"log in as any user" affordance.

**Acceptance criteria:**
- `login-form`, `login-email`, `login-password`, `login-submit`, `login-error`
  all preserved
- The error state is visually designed, not raw text
- Submitting shows a pending state and cannot be double-submitted
- Renders correctly in both light and dark mode
- Each demo button signs in as its role and lands on that role's dashboard
- The demo buttons only ever submit fixture credentials — no arbitrary user
- Manual login still works; the demo buttons are a shortcut, not a replacement
- New IDs added: `demo-login-{role}`

### PBI 6.14 — Roles admin matrix
**Description:** `/admin/roles` becomes a permission matrix instead of a bare
list.
**Acceptance criteria:**
- `roles-list` still resolves
- The matrix shows which permissions each role grants, readable at a glance
- Non-admins still cannot reach the screen
- Empty, loading, and error states are designed and reachable

### PBI 6.15 — Responsive app shell

**Description:** `src/app/(app)/layout.tsx` renders the sidebar as a permanent
flex child with no responsive treatment. Below roughly 700px the main region is
squeezed to around 165px, tables clip, and the page body scrolls horizontally.
Found while verifying 6.6 at 390px and inherited by every screen PBI since.

Split out of the 6.16 sweep because it is not a sweep item. Fixing it means
choosing and building a mobile navigation affordance — an off-canvas drawer
behind a menu button, or a collapsed icon-only rail — which is a shell design
decision, and every screen inherits whatever is chosen. A sweep that also has
to design the navigation is not a sweep.

This is not the mobile-first redesign the design doc puts out of scope. The bar
stays "nothing breaks at mobile widths"; the app remains desktop-first, as real
ATS tools are.

**Acceptance criteria:**
- No route scrolls the page body horizontally at 390px
- Every nav destination is reachable at mobile widths, and the current route is
  still indicated
- The sidebar is unchanged at desktop widths — this adds a breakpoint, it does
  not redesign the desktop shell
- Dark mode toggle and sign-out remain reachable in the mobile treatment
- `app-sidebar`, `nav-link-{section}`, `theme-toggle`, `user-menu` and
  `logout-button` all still resolve at both widths, since Epic 2 will assert
  against them at whatever viewport it runs
- Focus is trapped in the drawer while it is open, and Escape closes it, if a
  drawer is the chosen approach
- Verified at 390px and at desktop, in both light and dark mode

### PBI 6.16 — Consistency sweep
**Description:** Click every route as every role, in light and dark, at mobile
and desktop widths. Fix inconsistencies.
**Acceptance criteria:**
- No route renders unstyled or half-migrated UI in any role
- No horizontal scroll or broken layout at mobile widths
- `testid-contract.test.ts` passes — no test ID lost across the epic
- `npm test` and `npm run build` clean
