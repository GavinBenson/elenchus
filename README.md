# Elenchus

A small HCM/ATS/SaaS mock application — the system under test for a QA
engineer's portfolio project. Built to demonstrate senior/principal-level QA
skills end-to-end: system design, dynamic RBAC, API/DB testing surface,
CI pipeline, dashboarding, and (later) AI-assisted testing.

See [docs/roadmap](docs/roadmap/backlog.md) for the full epic/PBI backlog and
[docs/roadmap/defects.md](docs/roadmap/defects.md) for the defect log —
including a Critical auth bypass caught and fixed by a whole-branch review
before merge. See [docs/superpowers/specs](docs/superpowers/specs) and
[docs/superpowers/plans](docs/superpowers/plans) for the design/planning
trail behind each epic.

## What this is

- **Tech stack:** Next.js 16 (App Router), TypeScript, Prisma 7 + Neon
  Postgres, Tailwind, Vitest.
- **Auth:** JWT in an httpOnly cookie, bcrypt password hashing.
- **Authorization:** dynamic RBAC — roles are just named bundles of
  permissions (not hardcoded role checks), with per-user permission
  overrides on top. Every write endpoint checks a specific permission key.
- **Domain:** employees (with a manager/reports hierarchy), job postings,
  and an applicant pipeline (applied → interview → offer → hired/rejected).
- **UI:** intentionally minimal/functional (this app is the *test target*,
  not the portfolio's visual centerpiece) — a real ATS-quality UI is a
  planned future epic, see the roadmap.

## Local development

```bash
npm install
npx prisma migrate dev   # apply schema to your Postgres/Neon DB
npx prisma db seed       # load deterministic fixture data
npm run dev
```

Requires a `.env` with `DATABASE_URL` (Postgres/Neon connection string) and
`JWT_SECRET` (any random string in development). See `.env.example`.

### Seeded fixture users

All fixture users share the password `password123`:

| Email | Role |
|---|---|
| `admin@elenchus.test` | admin (all permissions) |
| `manager@elenchus.test` | manager |
| `recruiter@elenchus.test` | recruiter |
| `employee@elenchus.test` | employee (no permissions) |

## Testing

```bash
npm test          # Vitest — unit + API route tests
npm run build     # type-check + production build
```

`POST /api/test/reset` restores the database to the seeded fixture state
(non-production only) — intended for use by an automated test suite
(Epic 2, not yet built) between test runs.

## API

See [openapi.yaml](openapi.yaml) for the full API spec.
