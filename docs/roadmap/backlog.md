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

PBIs pending.

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

### PBI 6.1 — Data foundation
**Description:** Add `Applicant.stageChangedAt` (migration, stage PATCH
handler, OpenAPI). Expand the seed with ~40 employees, 6 postings, and 45
applicants spread across the five stages with varied dates — leaving the four
fixture users and their existing records byte-identical.
**Acceptance criteria:**
- Stage transitions update `stageChangedAt`; "days in stage" is derivable
- Running the seed twice yields identical state (no unseeded randomness)
- The four fixture users and their existing records are unchanged
- OpenAPI spec reflects the new field

### PBI 6.2 — Design system, shell, and applicants list
**Description:** `(app)` route group with a sidebar layout, `page-auth.ts`
helpers replacing per-page auth boilerplate, warm palette as Tailwind v4
`@theme` tokens, dark mode, and the `src/components/ui/` primitives — proven
by porting the applicants list in the same PBI.
**Acceptance criteria:**
- URLs are unchanged; every existing `data-testid` still resolves
- Nav links are filtered by resolved permissions (no Employees link without
  `view_all_employees`)
- Dark mode toggles, persists, defaults to OS preference, no flash on load
- `requireSession` / `requirePermission` have unit tests covering the
  unauthenticated, unpermitted, and success paths
- Applicants list has search, stage filter, role filter, and aging highlight

### PBI 6.3 — Pipeline board
**Description:** Five-column board at `/applicants/board` with dnd-kit
drag-and-drop, optimistic update, and rollback on API failure.
**Acceptance criteria:**
- Dragging a card between columns persists the stage change
- A failed API call rolls the card back and surfaces an error
- Dragging works by keyboard, not only mouse
- The detail-page `StageControl` dropdown still works unchanged

### PBI 6.4 — Applicant detail
**Description:** Two-column detail: candidate summary, stage timeline, linked
posting, resume link. Stage control restyled in place.
**Acceptance criteria:**
- Stage timeline reflects `appliedAt` and `stageChangedAt`
- `applicant-detail`, `applicant-name`, `applicant-email`,
  `applicant-stage`, `applicant-job-posting` all still resolve

### PBI 6.5 — Job postings and employees
**Description:** List and detail screens for both resources adopt the design
system. Employees renders the manager/reports hierarchy.
**Acceptance criteria:**
- An employee's direct reports are visible and navigable from their detail page
- Job posting detail shows its applicant pipeline with counts
- Permission gating behaves exactly as before

### PBI 6.6 — Dashboards
**Description:** All four role variants rebuilt — admin tiles plus stage
distribution, recruiter postings with counts and aging-offer callout, manager
reports table, employee landing screen.
**Acceptance criteria:**
- Each role sees its own variant; `dashboard-{role}` test IDs preserved
- `stat-employee-count`, `stat-posting-count`, `stat-applicant-count` still
  resolve and still report correct numbers
- No dashboard renders data the user lacks permission to see

### PBI 6.7 — Login and roles admin
**Description:** Split-screen login treatment. Roles admin becomes a
permission matrix.
**Acceptance criteria:**
- `login-form`, `login-email`, `login-password`, `login-submit`, `login-error`
  all preserved; error state is visually designed
- Roles matrix shows which permissions each role grants
- Non-admins still cannot reach the roles screen

### PBI 6.8 — Consistency sweep
**Description:** Click every route as every role, in light and dark, at mobile
and desktop widths. Fix inconsistencies.
**Acceptance criteria:**
- No route renders unstyled or half-migrated UI in any role
- No horizontal scroll or broken layout at mobile widths
- `testid-contract.test.ts` passes — no test ID lost across the epic
- `npm test` and `npm run build` clean
