# Epic 1 — Mock Application Design

Part of the [TwentyQA roadmap](2026-07-29-roadmap-design.md). This is the
system under test that Epics 2-5 build against.

## Purpose

A small, realistic hybrid HCM/ATS/SaaS application (employees, job postings,
applicants, dynamic role-based permissions) that provides authentic surface
area for API, UI, DB-level, and eventually AI-assisted testing. Not a
polished product — a deliberately-scoped test target.

## Stack

- Next.js (App Router), TypeScript
- Neon Postgres via Prisma ORM
- Tailwind CSS (functional styling only, no design polish — this app is not
  the portfolio piece, the test suite built against it is)
- JWT in httpOnly cookie for auth, bcrypt for password hashing
- Zod for request validation

Rationale: single language (TypeScript) across app and Playwright test suite;
Next.js gives API routes + UI in one project instead of a separate backend;
Neon chosen over Supabase to keep the DB layer plain Postgres (stronger "I
know SQL" signal, fewer bundled extras not needed here).

## Data Model (Prisma)

- `User` — id, email, passwordHash, roleId (FK Role), createdAt
- `Role` — id, name (e.g. admin, manager, recruiter, employee)
- `Permission` — id, key (e.g. `edit_job_postings`, `view_all_employees`)
- `RolePermission` — join table, Role <-> Permission (many-to-many)
- `UserPermissionOverride` — userId, permissionId, granted (bool) — one-off
  grant/revoke without needing a new role
- `Employee` — id, userId (FK User, optional/1:1), name, department, title,
  hireDate, status (active/terminated), managerId (self-FK to Employee,
  nullable — org hierarchy)
- `JobPosting` — id, title, department, status (open/closed), createdBy (FK
  User), createdAt
- `Applicant` — id, jobPostingId (FK), name, email, resumeUrl, stage
  (applied/interview/offer/hired/rejected), appliedAt

### Permission model rationale

Predefined, hardcoded roles (`if role === 'admin'`) create long-term overhead
and tech debt as requirements evolve (a real problem observed in production).
Instead: `Role` is just a named bundle of `Permission`s. All authorization
checks in code call `hasPermission(user, 'permission_key')`, never compare
role strings directly. `UserPermissionOverride` allows one-off exceptions
without minting new roles. This is also a strong test target: permission-
boundary tests, override tests, and negative-permission tests exercise real
architectural judgment, not just CRUD happy paths.

## API Endpoints

All under `/api/*`, JSON in/out.

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST /api/employees`, `GET/PATCH/DELETE /api/employees/:id`
- `GET/POST /api/job-postings`, `GET/PATCH/DELETE /api/job-postings/:id`
- `GET/POST /api/applicants`, `GET/PATCH/DELETE /api/applicants/:id`,
  `PATCH /api/applicants/:id/stage`
- `GET/POST /api/roles`, `GET/POST /api/permissions` (admin-only)
- `POST /api/test/reset` (non-prod only, gated by `NODE_ENV`) — resets DB to
  seed state, prevents test pollution between Playwright runs

Every write endpoint checks the caller's permissions via `hasPermission()`
before executing.

## Auth

JWT stored in an httpOnly cookie (no third-party auth provider — avoids
flaky external dependency in tests). Middleware decodes the JWT on each API
request, resolves the user's effective permissions (role bundle + overrides),
and attaches both to the request context before the handler runs.

## UI Scope

Minimal, functional, server-rendered pages — just enough surface for E2E
tests, not a polished product:

- `/login`
- `/dashboard` — role-aware landing (admin: org-wide stats; manager: own
  reports; recruiter: open postings)
- `/employees` — list + detail/edit
- `/job-postings` — list + detail, with nested applicant pipeline view
  (applied -> interview -> offer -> hired/rejected)
- `/admin/roles` — role/permission management (admin-only)

## Error Handling

Consistent JSON error shape across all API routes:

```
{ "error": { "code": "...", "message": "..." } }
```

Standard HTTP status codes: 400 (validation, via Zod), 401 (unauthenticated),
403 (unauthorized/permission denied), 404 (not found), 500 (unhandled).
Consistency here matters because it's the contract the Playwright API suite
(Epic 2) asserts against.

## Testing Hooks (delivered here, consumed by Epic 2+)

- `data-testid` attributes on key interactive UI elements — stable selectors
  independent of text/CSS changes
- `prisma/seed.ts` — deterministic seed data: fixed users per role, fixed job
  postings/applicants, so tests run against known state
- `POST /api/test/reset` — resets to seed state between test runs
- OpenAPI spec maintained alongside routes — feeds API test design now and
  the AI test-generation epic (Epic 5) later

## Out of Scope (Epic 1)

- Visual polish / design system for this app's own UI (it is the test
  target, not the showcase)
- Any AI features (deferred to Epic 5)
- Third-party auth providers

## Next Step

Write implementation plan (writing-plans skill) for Epic 1, then build it.
Epic 2 (Playwright suite) is brainstormed only after Epic 1 is implemented,
so its design reflects the real, built interfaces rather than assumptions.
