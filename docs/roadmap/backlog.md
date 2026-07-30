# Backlog

PBIs per epic. See [roadmap](../superpowers/specs/2026-07-29-roadmap-design.md)
for epic overview, and each epic's design doc for architectural detail.

## Epic 1 — Mock Application

Design: [2026-07-29-epic1-mock-app-design.md](../superpowers/specs/2026-07-29-epic1-mock-app-design.md)

### PBI 1.1 — Project scaffold
**Description:** Initialize Next.js (App Router) + TypeScript project. Set up
Prisma with Neon Postgres connection. Configure Tailwind, ESLint, Zod.
**Acceptance criteria:**
- `npm run dev` serves a blank Next.js app
- Prisma connects to Neon and can run `migrate dev`
- Lint passes on a clean checkout

### PBI 1.2 — Data model & migrations
**Description:** Implement Prisma schema: User, Role, Permission,
RolePermission, UserPermissionOverride, Employee, JobPosting, Applicant.
**Acceptance criteria:**
- Schema matches design doc's data model section
- Migration runs cleanly against Neon
- Self-referential `Employee.managerId` relation works (query an employee's
  reports)

### PBI 1.3 — Auth (login/logout/session)
**Description:** JWT-in-httpOnly-cookie auth. `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/auth/me`. Bcrypt password hashing.
**Acceptance criteria:**
- Valid credentials return a session cookie; `GET /api/auth/me` reflects
  logged-in user
- Invalid credentials return 401 with standard error shape
- Logout clears the session cookie

### PBI 1.4 — Permission engine
**Description:** `hasPermission(user, key)` resolving effective permissions
from Role bundle + UserPermissionOverride. Middleware attaches resolved
permissions to request context.
**Acceptance criteria:**
- A permission granted via Role passes `hasPermission`
- A permission revoked via override on a role that grants it fails
  `hasPermission`
- A permission granted via override on a role that lacks it passes
  `hasPermission`

### PBI 1.5 — Employees API
**Description:** `GET/POST /api/employees`, `GET/PATCH/DELETE /api/employees/:id`,
permission-gated.
**Acceptance criteria:**
- Authorized role can perform each operation; unauthorized gets 403
- Unauthenticated request gets 401
- Invalid payload gets 400 with field-level Zod errors

### PBI 1.6 — Job Postings API
**Description:** `GET/POST /api/job-postings`, `GET/PATCH/DELETE /api/job-postings/:id`,
permission-gated.
**Acceptance criteria:** same shape as PBI 1.5, scoped to job postings.

### PBI 1.7 — Applicants API
**Description:** `GET/POST /api/applicants`, `GET/PATCH/DELETE /api/applicants/:id`,
`PATCH /api/applicants/:id/stage`.
**Acceptance criteria:**
- Stage transitions (applied -> interview -> offer -> hired/rejected) persist
  correctly
- Same auth/validation shape as other resource APIs

### PBI 1.8 — Roles & Permissions admin API
**Description:** `GET/POST /api/roles`, `GET/POST /api/permissions`,
admin-only.
**Acceptance criteria:**
- Non-admin gets 403 on all these routes
- Admin can create a role, attach permissions, and see it reflected in
  `hasPermission` checks for a user with that role

### PBI 1.9 — Seed script & test-reset endpoint
**Description:** `prisma/seed.ts` with deterministic fixture data (fixed
users per role, postings, applicants). `POST /api/test/reset`, gated to
non-prod, restores seed state.
**Acceptance criteria:**
- Running seed script twice yields identical fixture state
- `/api/test/reset` is unreachable when `NODE_ENV=production`
- Calling reset mid-test restores known state (no leftover test data)

### PBI 1.10 — UI pages
**Description:** `/login`, `/dashboard` (role-aware), `/employees`,
`/job-postings` (with pipeline view), `/admin/roles`. `data-testid` on
interactive elements.
**Acceptance criteria:**
- Each role sees the dashboard variant described in the design doc
- All interactive elements (forms, buttons, nav) carry stable `data-testid`
- Pages render only data the logged-in user is permitted to see

### PBI 1.11 — OpenAPI spec
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
