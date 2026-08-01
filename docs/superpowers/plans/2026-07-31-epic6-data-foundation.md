# Epic 6 Data Foundation (PBIs 6.1 + 6.2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Epic 6's UI work a realistic data foundation — an
`Applicant.stageChangedAt` field so "days in stage" is derivable, and a seed
expanded to ~40 employees, 6 postings, and 45 applicants.

**Architecture:** `stageChangedAt` is added by migration with a backfill from
`appliedAt`, and set by the stage PATCH handler only — the general applicant
PATCH cannot change stage, so it stays untouched. The seed is split into data
modules (`prisma/seed-data/*.ts`) holding literal records, with `prisma/seed.ts`
reduced to orchestration. Existing fixture records are never modified.

**Tech Stack:** Prisma 7.9 + Postgres (Neon), TypeScript, Vitest, Zod.

## Global Constraints

- The four fixture users (`admin@`, `manager@`, `recruiter@`, `employee@`
  `elenchus.test`, all with password `password123`) and their existing records
  — Morgan Manager, Eli Employee, the "QA Engineer" posting, Alex Applicant —
  must remain **byte-identical**. New records are appended; existing ones are
  never edited. In particular, Morgan Manager keeps `managerId: null`.
- Applicant stages are exactly `applied | interview | offer | hired |
  rejected`. No new stages.
- The seed must be deterministic: no `Math.random()`, no `faker`, no unseeded
  generators.
- Tests run against the real database in `DATABASE_URL` (there is no separate
  test database). Any test that writes must clean up after itself, except the
  determinism test, which deliberately reseeds.
- Existing tests must keep passing: `npm test`.
- `npm run build` must stay clean.

### Date strategy (applies to Tasks 5–7)

Employee `hireDate` values are **fixed literal dates** — hire dates are
historical and should not move.

Applicant `appliedAt` and `stageChangedAt` are **offsets in days from midnight
UTC of the current day**. Fixed literals would mean that a year from now every
applicant shows "400 days in stage" and the aging highlight becomes
meaningless. Relative offsets keep the demo sensible forever.

This makes the seed deterministic *within a calendar day*, which is what the
determinism test requires. Known caveat: a *seed run* that straddles midnight
UTC. The risk was never a one-second assertion mismatch — `dayStart()` is called
once per date-bearing row (50+ times per seed), so if the clock rolled over
mid-run, some rows would anchor to one day and the rest to the next, producing
an internally inconsistent seed (and a determinism failure spanning many rows).
Fixed by memoising the anchor in `dates.ts`: it is computed once per process, so
any single seed run is self-consistent regardless of when it starts. Two runs on
opposite sides of midnight still differ — that residual window is accepted.

---

## File Structure

**Created:**
- `prisma/migrations/<timestamp>_add_stage_changed_at/migration.sql` — adds the
  column and backfills it from `appliedAt`
- `prisma/seed-data/dates.ts` — the `daysAgo` helper shared by the data modules
- `prisma/seed-data/employees.ts` — 40 literal employee records plus the
  existing two, with hierarchy expressed by manager name
- `prisma/seed-data/postings.ts` — 6 literal job postings plus the existing one
- `prisma/seed-data/applicants.ts` — 45 literal applicants plus the existing one
- `prisma/seed.test.ts` — fixture preservation and determinism tests

**Modified:**
- `prisma/schema.prisma` — `Applicant.stageChangedAt`
- `src/app/api/applicants/[id]/stage/route.ts` — set `stageChangedAt` on transition
- `src/app/api/applicants/stage.test.ts` — add the stageChangedAt behavior test
- `prisma/seed.ts` — reduced to orchestration over the data modules
- `openapi.yaml` — an `Applicant` component schema including `stageChangedAt`

The seed splits because it grows from ~130 lines to well over 400 with the new
records. Literal data belongs in modules that change when the data changes;
orchestration belongs in `seed.ts` and changes when the *process* changes.

---

## Task 1: Add the `stageChangedAt` column

**Files:**
- Modify: `prisma/schema.prisma` (the `Applicant` model)
- Create: `prisma/migrations/<timestamp>_add_stage_changed_at/migration.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `Applicant.stageChangedAt: DateTime` — non-null, defaults to
  `now()`, backfilled to each row's `appliedAt`.

- [ ] **Step 1: Add the field to the schema**

In `prisma/schema.prisma`, the `Applicant` model becomes:

```prisma
model Applicant {
  id             String     @id @default(cuid())
  jobPostingId   String
  jobPosting     JobPosting @relation(fields: [jobPostingId], references: [id])
  name           String
  email          String
  resumeUrl      String?
  stage          String     @default("applied") // applied | interview | offer | hired | rejected
  appliedAt      DateTime   @default(now())
  stageChangedAt DateTime   @default(now())
}
```

- [ ] **Step 2: Generate the migration without applying it**

Run: `npx prisma migrate dev --name add_stage_changed_at --create-only`

Expected: prints the path to a new migration directory and does **not** apply
it. `--create-only` is required here because the generated SQL needs a backfill
added by hand.

- [ ] **Step 3: Add the backfill to the generated SQL**

Open the generated `migration.sql`. Prisma will have written an `ALTER TABLE`
adding the column with a default. Append a backfill so existing rows get a
meaningful value instead of the migration timestamp:

```sql
-- Backfill: a row that has never changed stage has been in its stage
-- since it was created.
UPDATE "Applicant" SET "stageChangedAt" = "appliedAt";
```

The `UPDATE` must come after the `ALTER TABLE` in the file.

- [ ] **Step 4: Apply the migration**

Run: `npx prisma migrate dev`

Expected: applies the pending migration and regenerates the Prisma client.

- [ ] **Step 5: Verify the backfill**

Run:

```bash
npx prisma db execute --stdin <<'SQL'
SELECT COUNT(*) AS mismatched FROM "Applicant" WHERE "stageChangedAt" <> "appliedAt";
SQL
```

Expected: `mismatched` is `0` — no existing row was given a timestamp unrelated
to its history.

- [ ] **Step 6: Confirm nothing else broke**

Run: `npm test`
Expected: PASS — all existing tests, unchanged.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Applicant.stageChangedAt with backfill from appliedAt"
```

---

## Task 2: Set `stageChangedAt` on stage transitions

**Files:**
- Modify: `src/app/api/applicants/[id]/stage/route.ts:27` (the `db.applicant.update` call)
- Test: `src/app/api/applicants/stage.test.ts`

**Interfaces:**
- Consumes: `Applicant.stageChangedAt` from Task 1.
- Produces: `PATCH /api/applicants/:id/stage` responses now include a
  `stageChangedAt` field updated to the transition time.

Note: the general `PATCH /api/applicants/:id` handler validates against
`UpdateApplicantSchema`, which has no `stage` property, so it cannot change
stage and needs no modification. That is what makes the "other applicant
updates do not touch stageChangedAt" criterion true by construction.

- [ ] **Step 1: Write the failing test**

Append to `src/app/api/applicants/stage.test.ts`. This test writes to the
database, so it creates its own posting and applicant and deletes them in a
`finally` block.

```typescript
import { db } from '@/lib/db'

describe('PATCH /api/applicants/:id/stage — stageChangedAt', () => {
  it('advances stageChangedAt when the stage changes', async () => {
    const recruiter = await db.user.findFirstOrThrow({
      where: { email: 'recruiter@elenchus.test' },
    })
    const posting = await db.jobPosting.create({
      data: {
        title: 'Temp Posting (stageChangedAt test)',
        department: 'Engineering',
        status: 'open',
        createdById: recruiter.id,
      },
    })
    const applicant = await db.applicant.create({
      data: {
        jobPostingId: posting.id,
        name: 'Stage Test Applicant',
        email: 'stage.test@example.com',
        stage: 'applied',
        appliedAt: new Date('2026-01-01T00:00:00.000Z'),
        stageChangedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    })

    try {
      const request = new Request(
        `http://localhost/api/applicants/${applicant.id}/stage`,
        {
          method: 'PATCH',
          headers: {
            'x-user-id': recruiter.id,
            'x-user-permissions': 'delete_applicant',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ stage: 'interview' }),
        }
      )
      const response = await PATCH(request, {
        params: Promise.resolve({ id: applicant.id }),
      })
      expect(response.status).toBe(200)

      const updated = await db.applicant.findUniqueOrThrow({
        where: { id: applicant.id },
      })
      expect(updated.stage).toBe('interview')
      expect(updated.stageChangedAt.getTime()).toBeGreaterThan(
        applicant.stageChangedAt.getTime()
      )
      // appliedAt records when they applied and must not move.
      expect(updated.appliedAt.getTime()).toBe(applicant.appliedAt.getTime())
    } finally {
      await db.applicant.delete({ where: { id: applicant.id } })
      await db.jobPosting.delete({ where: { id: posting.id } })
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/applicants/stage.test.ts -t "advances stageChangedAt"`

Expected: FAIL — `stageChangedAt` still equals the seeded `2026-01-01` value,
so `toBeGreaterThan` fails.

- [ ] **Step 3: Set the field in the handler**

In `src/app/api/applicants/[id]/stage/route.ts`, change the update call:

```typescript
    const applicant = await db.applicant.update({
      where: { id },
      data: { stage: body.stage, stageChangedAt: new Date() },
    })
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/api/applicants/stage.test.ts -t "advances stageChangedAt"`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — including the pre-existing 400/404 stage tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/applicants/[id]/stage/route.ts src/app/api/applicants/stage.test.ts
git commit -m "feat: set stageChangedAt on applicant stage transitions"
```

---

## Task 3: Document `stageChangedAt` in the OpenAPI spec

**Files:**
- Modify: `openapi.yaml`

**Interfaces:**
- Consumes: the field from Task 1.
- Produces: `#/components/schemas/Applicant`, referenced by the applicant
  endpoints that return an applicant.

The spec currently describes applicant responses only as prose
(`'200': { description: Updated applicant }`) with no schema, so there is
nowhere for the new field to appear. This task adds an `Applicant` schema and
points the applicant responses at it. Scope is applicants only — other
resources keep their current prose descriptions.

- [ ] **Step 1: Add the Applicant schema component**

In `openapi.yaml`, under `components.schemas` (alongside the existing `Error`
schema), add:

```yaml
    Applicant:
      type: object
      required: [id, jobPostingId, name, email, stage, appliedAt, stageChangedAt]
      properties:
        id: { type: string }
        jobPostingId: { type: string }
        name: { type: string }
        email: { type: string, format: email }
        resumeUrl: { type: string, format: uri, nullable: true }
        stage:
          type: string
          enum: [applied, interview, offer, hired, rejected]
        appliedAt:
          type: string
          format: date-time
          description: When the candidate applied. Never changes.
        stageChangedAt:
          type: string
          format: date-time
          description: >
            When the applicant last moved stage. Set to appliedAt on creation
            and updated by PATCH /api/applicants/{id}/stage. Days-in-stage is
            derived from this field.
```

- [ ] **Step 2: Reference it from the stage endpoint**

In the `patch` block for `/api/applicants/{id}/stage`, replace:

```yaml
        '200': { description: Updated applicant }
```

with:

```yaml
        '200':
          description: Updated applicant
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Applicant' }
```

- [ ] **Step 3: Reference it from the applicant GET endpoint**

In the `get` block for `/api/applicants/{id}`, replace the `'200'` line the
same way:

```yaml
        '200':
          description: Applicant
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Applicant' }
```

- [ ] **Step 4: Reference it from the list endpoint**

In the `get` block for `/api/applicants`, replace:

```yaml
        '200': { description: Array of applicants }
```

with:

```yaml
        '200':
          description: Array of applicants
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Applicant' }
```

- [ ] **Step 5: Validate the spec parses**

Run: `npx --yes @redocly/cli lint openapi.yaml`

Expected: no errors. Warnings about missing descriptions or tags on *other*
endpoints are pre-existing and acceptable — the gate is that there are no
errors and no warnings referencing `Applicant` or `stageChangedAt`.

- [ ] **Step 6: Commit**

```bash
git add openapi.yaml
git commit -m "docs: add Applicant schema to OpenAPI spec with stageChangedAt"
```

---

## Task 4: Extract seed data into modules

**Files:**
- Create: `prisma/seed-data/employees.ts`
- Create: `prisma/seed-data/postings.ts`
- Create: `prisma/seed-data/applicants.ts`
- Create: `prisma/seed.test.ts`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `SeedEmployee = { name: string; department: string; title: string; hireDate: string; status?: 'active' | 'terminated'; managerName: string | null; userEmail?: string }`
  - `SeedPosting = { title: string; department: string; status: 'open' | 'closed'; createdByEmail: string }`
  - `SeedApplicant = { name: string; email: string; postingTitle: string; stage: 'applied' | 'interview' | 'offer' | 'hired' | 'rejected'; appliedDaysAgo: number; stageChangedDaysAgo: number }`
  - `employees: SeedEmployee[]`, `postings: SeedPosting[]`, `applicants: SeedApplicant[]`
  - `runSeed()` keeps its current signature and export.

This task is a **pure refactor**: the same records the seed produces today,
moved into data modules and driven by a generic loop. No new records. Doing it
separately means Task 5 and 6 are reviewable as pure data additions, and if the
refactor breaks something, it breaks alone.

Records reference each other by natural key (`managerName`, `postingTitle`,
`createdByEmail`) rather than by ID, because IDs are `cuid()` and only exist
after insertion.

- [ ] **Step 1: Write the failing fixture-preservation test**

Create `prisma/seed.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { db } from '../src/lib/db'
import { runSeed } from './seed'

describe('seed — fixture preservation', () => {
  beforeAll(async () => {
    await runSeed()
  }, 60_000)

  it('keeps the four fixture users', async () => {
    const users = await db.user.findMany({
      where: { email: { endsWith: '@elenchus.test' } },
      include: { role: true },
      orderBy: { email: 'asc' },
    })
    expect(users.map((u) => [u.email, u.role.name])).toEqual([
      ['admin@elenchus.test', 'admin'],
      ['employee@elenchus.test', 'employee'],
      ['manager@elenchus.test', 'manager'],
      ['recruiter@elenchus.test', 'recruiter'],
    ])
  })

  it('keeps Morgan Manager unchanged, including a null managerId', async () => {
    const morgan = await db.employee.findFirstOrThrow({
      where: { name: 'Morgan Manager' },
    })
    expect(morgan.department).toBe('Engineering')
    expect(morgan.title).toBe('Engineering Manager')
    expect(morgan.hireDate.toISOString()).toBe('2022-01-10T00:00:00.000Z')
    expect(morgan.status).toBe('active')
    expect(morgan.managerId).toBeNull()
  })

  it('keeps Eli Employee reporting to Morgan Manager', async () => {
    const eli = await db.employee.findFirstOrThrow({
      where: { name: 'Eli Employee' },
      include: { manager: true },
    })
    expect(eli.department).toBe('Engineering')
    expect(eli.title).toBe('Software Engineer')
    expect(eli.hireDate.toISOString()).toBe('2023-03-01T00:00:00.000Z')
    expect(eli.manager?.name).toBe('Morgan Manager')
  })

  it('keeps the QA Engineer posting and Alex Applicant', async () => {
    const posting = await db.jobPosting.findFirstOrThrow({
      where: { title: 'QA Engineer' },
      include: { createdBy: true },
    })
    expect(posting.department).toBe('Engineering')
    expect(posting.status).toBe('open')
    expect(posting.createdBy.email).toBe('recruiter@elenchus.test')

    const alex = await db.applicant.findFirstOrThrow({
      where: { name: 'Alex Applicant' },
      include: { jobPosting: true },
    })
    expect(alex.email).toBe('alex.applicant@example.com')
    expect(alex.stage).toBe('applied')
    expect(alex.jobPosting.title).toBe('QA Engineer')
  })
})
```

- [ ] **Step 2: Run it to confirm it passes against the current seed**

Run: `npx vitest run prisma/seed.test.ts`

Expected: PASS. This is deliberate — the test characterises the seed as it
exists today, so it can catch the refactor in Step 6 breaking something. A test
that passes before the change and after it is exactly what a refactor needs.

- [ ] **Step 3: Create the employees data module**

Create `prisma/seed-data/employees.ts`:

```typescript
export type SeedEmployee = {
  name: string
  department: string
  title: string
  /** ISO date string — hire dates are historical and never relative. */
  hireDate: string
  status?: 'active' | 'terminated'
  /** Natural-key reference to another employee in this list, or null for top of tree. */
  managerName: string | null
  /** Set only for employees backed by a fixture login. */
  userEmail?: string
}

export const employees: SeedEmployee[] = [
  {
    name: 'Morgan Manager',
    department: 'Engineering',
    title: 'Engineering Manager',
    hireDate: '2022-01-10',
    managerName: null,
    userEmail: 'manager@elenchus.test',
  },
  {
    name: 'Eli Employee',
    department: 'Engineering',
    title: 'Software Engineer',
    hireDate: '2023-03-01',
    managerName: 'Morgan Manager',
    userEmail: 'employee@elenchus.test',
  },
]
```

- [ ] **Step 4: Create the postings and applicants data modules**

Create `prisma/seed-data/postings.ts`:

```typescript
export type SeedPosting = {
  title: string
  department: string
  status: 'open' | 'closed'
  /** Natural-key reference to a seeded user. */
  createdByEmail: string
}

export const postings: SeedPosting[] = [
  {
    title: 'QA Engineer',
    department: 'Engineering',
    status: 'open',
    createdByEmail: 'recruiter@elenchus.test',
  },
]
```

Create `prisma/seed-data/applicants.ts`:

```typescript
export type SeedApplicant = {
  name: string
  email: string
  /** Natural-key reference to a posting title. */
  postingTitle: string
  stage: 'applied' | 'interview' | 'offer' | 'hired' | 'rejected'
  appliedDaysAgo: number
  stageChangedDaysAgo: number
}

export const applicants: SeedApplicant[] = [
  {
    name: 'Alex Applicant',
    email: 'alex.applicant@example.com',
    postingTitle: 'QA Engineer',
    stage: 'applied',
    appliedDaysAgo: 0,
    stageChangedDaysAgo: 0,
  },
]
```

- [ ] **Step 5: Create the date helper**

Create `prisma/seed-data/dates.ts`:

```typescript
/**
 * Midnight UTC of the current day. Anchoring to the start of the day rather
 * than to `now()` is what makes the seed deterministic across runs: two runs
 * on the same calendar day produce identical timestamps.
 */
export function dayStart(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
}

/** A date `days` before midnight UTC today. */
export function daysAgo(days: number): Date {
  const d = dayStart()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}
```

- [ ] **Step 6: Rewrite seed.ts to drive the data modules**

Replace everything in `prisma/seed.ts` from the `managerEmployee` creation
through the `applicant.create` call (the block that currently hardcodes
records) with the loops below. Everything above it — the deletes, permissions,
roles, grants, and the four `db.user.create` calls — stays exactly as it is.

Add these imports at the top of the file:

```typescript
import { employees } from './seed-data/employees'
import { postings } from './seed-data/postings'
import { applicants } from './seed-data/applicants'
import { daysAgo } from './seed-data/dates'
```

Then, in place of the hardcoded record creation:

```typescript
  const userIdByEmail: Record<string, string> = {
    'admin@elenchus.test': admin.id,
    'manager@elenchus.test': manager.id,
    'recruiter@elenchus.test': recruiter.id,
    'employee@elenchus.test': employeeUser.id,
  }

  // Employees are inserted in list order, and every managerName must refer to
  // someone earlier in the list, so a manager always exists before a report.
  const employeeIdByName: Record<string, string> = {}
  for (const e of employees) {
    if (e.managerName && !employeeIdByName[e.managerName]) {
      throw new Error(
        `Seed data error: "${e.name}" lists manager "${e.managerName}", who is not defined earlier in the list.`
      )
    }
    const created = await db.employee.create({
      data: {
        name: e.name,
        department: e.department,
        title: e.title,
        hireDate: new Date(e.hireDate),
        status: e.status ?? 'active',
        managerId: e.managerName ? employeeIdByName[e.managerName] : null,
        userId: e.userEmail ? userIdByEmail[e.userEmail] : null,
      },
    })
    employeeIdByName[e.name] = created.id
  }

  const postingIdByTitle: Record<string, string> = {}
  for (const p of postings) {
    const created = await db.jobPosting.create({
      data: {
        title: p.title,
        department: p.department,
        status: p.status,
        createdById: userIdByEmail[p.createdByEmail],
      },
    })
    postingIdByTitle[p.title] = created.id
  }

  for (const a of applicants) {
    const jobPostingId = postingIdByTitle[a.postingTitle]
    if (!jobPostingId) {
      throw new Error(
        `Seed data error: applicant "${a.name}" references unknown posting "${a.postingTitle}".`
      )
    }
    await db.applicant.create({
      data: {
        jobPostingId,
        name: a.name,
        email: a.email,
        stage: a.stage,
        appliedAt: daysAgo(a.appliedDaysAgo),
        stageChangedAt: daysAgo(a.stageChangedDaysAgo),
      },
    })
  }
```

Update the closing `console.log` to report the new counts:

```typescript
  console.log('Seed complete:', {
    users: 4,
    employees: employees.length,
    postings: postings.length,
    applicants: applicants.length,
  })
```

- [ ] **Step 7: Run the fixture test to verify the refactor preserved everything**

Run: `npx vitest run prisma/seed.test.ts`

Expected: PASS — the same four tests that passed in Step 2. If any fail, the
refactor changed a record it should not have.

- [ ] **Step 8: Run the full suite and build**

Run: `npm test && npm run build`
Expected: PASS, clean build.

- [ ] **Step 9: Commit**

```bash
git add prisma/seed.ts prisma/seed-data prisma/seed.test.ts
git commit -m "refactor: drive seed from data modules, add fixture preservation tests"
```

---

## Task 5: Expand the employee roster

**Files:**
- Modify: `prisma/seed-data/employees.ts`
- Test: `prisma/seed.test.ts`

**Interfaces:**
- Consumes: `SeedEmployee` and the manager-ordering rule from Task 4.
- Produces: 42 employees total (2 fixtures + 40 new), a hierarchy four levels
  deep, and two terminated employees.

The new hierarchy is built entirely from new employees. Morgan Manager keeps
`managerId: null` — hanging Morgan off a new VP would modify a fixture record.

- [ ] **Step 1: Write the failing test**

Append to `prisma/seed.test.ts`:

```typescript
describe('seed — expanded roster', () => {
  it('seeds at least 40 employees', async () => {
    const count = await db.employee.count()
    expect(count).toBeGreaterThanOrEqual(40)
  })

  it('has a hierarchy at least four levels deep', async () => {
    // Walk up from a known individual contributor to the top of the tree.
    let current = await db.employee.findFirstOrThrow({
      where: { name: 'Yuki Tanaka' },
    })
    let depth = 1
    while (current.managerId) {
      current = await db.employee.findUniqueOrThrow({
        where: { id: current.managerId },
      })
      depth += 1
    }
    expect(depth).toBeGreaterThanOrEqual(4)
    expect(current.name).toBe('Rosalind Achebe')
  })

  it('includes terminated employees so the UI can distinguish them', async () => {
    const terminated = await db.employee.count({
      where: { status: 'terminated' },
    })
    expect(terminated).toBeGreaterThanOrEqual(2)
  })

  it('spans multiple departments', async () => {
    const rows = await db.employee.findMany({ select: { department: true } })
    const departments = new Set(rows.map((r) => r.department))
    expect(departments.size).toBeGreaterThanOrEqual(5)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run prisma/seed.test.ts -t "expanded roster"`
Expected: FAIL — only 2 employees exist, and `Yuki Tanaka` is not found.

- [ ] **Step 3: Add the 40 new employees**

Append to the `employees` array in `prisma/seed-data/employees.ts`, after the
two fixture entries. Order matters: every `managerName` refers to someone
earlier in the list.

```typescript
  // ---- Leadership ----
  { name: 'Rosalind Achebe', department: 'Executive', title: 'Chief Executive Officer', hireDate: '2019-02-04', managerName: null },
  { name: 'Priyanka Venkatesan', department: 'Engineering', title: 'VP of Engineering', hireDate: '2019-06-17', managerName: 'Rosalind Achebe' },
  { name: 'Anders Lindqvist', department: 'Sales', title: 'VP of Sales', hireDate: '2020-01-13', managerName: 'Rosalind Achebe' },
  { name: 'Naomi Okonkwo', department: 'People', title: 'VP of People', hireDate: '2020-03-02', managerName: 'Rosalind Achebe' },
  { name: 'Gustavo Ferreira', department: 'Finance', title: 'VP of Finance', hireDate: '2020-08-24', managerName: 'Rosalind Achebe' },
  { name: 'Mateus Oliveira', department: 'Design', title: 'Design Manager', hireDate: '2021-04-12', managerName: 'Rosalind Achebe' },

  // ---- Middle management ----
  { name: 'Wei-Lin Chao', department: 'Engineering', title: 'Engineering Manager, Platform', hireDate: '2020-09-07', managerName: 'Priyanka Venkatesan' },
  { name: 'Ibrahim Al-Rashid', department: 'Engineering', title: 'Engineering Manager, Product', hireDate: '2021-01-25', managerName: 'Priyanka Venkatesan' },
  { name: 'Saoirse Gallagher', department: 'Engineering', title: 'QA Manager', hireDate: '2021-07-19', managerName: 'Priyanka Venkatesan' },
  { name: 'Farida Haddad', department: 'Analytics', title: 'Analytics Manager', hireDate: '2021-09-06', managerName: 'Gustavo Ferreira' },

  // ---- Platform engineering ----
  { name: 'Kenji Watanabe', department: 'Engineering', title: 'Senior Platform Engineer', hireDate: '2021-02-15', managerName: 'Wei-Lin Chao' },
  { name: 'Amara Nwosu', department: 'Engineering', title: 'Platform Engineer', hireDate: '2022-05-09', managerName: 'Wei-Lin Chao' },
  { name: 'Tomás Restrepo', department: 'Engineering', title: 'Platform Engineer', hireDate: '2023-01-16', managerName: 'Wei-Lin Chao' },
  { name: 'Ingrid Bauer', department: 'Engineering', title: 'Site Reliability Engineer', hireDate: '2022-11-14', managerName: 'Wei-Lin Chao' },
  { name: 'Hyun-woo Park', department: 'Engineering', title: 'Site Reliability Engineer', hireDate: '2024-02-05', managerName: 'Wei-Lin Chao' },

  // ---- Product engineering ----
  { name: 'Leilani Kahale', department: 'Engineering', title: 'Senior Software Engineer', hireDate: '2021-06-01', managerName: 'Ibrahim Al-Rashid' },
  { name: 'Dmitri Volkov', department: 'Engineering', title: 'Software Engineer', hireDate: '2022-02-21', status: 'terminated', managerName: 'Ibrahim Al-Rashid' },
  { name: 'Chiara Rossi', department: 'Engineering', title: 'Software Engineer', hireDate: '2023-04-03', managerName: 'Ibrahim Al-Rashid' },
  { name: 'Kwame Mensah', department: 'Engineering', title: 'Software Engineer', hireDate: '2023-10-30', managerName: 'Ibrahim Al-Rashid' },
  { name: 'Sanne de Vries', department: 'Engineering', title: 'Junior Software Engineer', hireDate: '2025-01-20', managerName: 'Ibrahim Al-Rashid' },

  // ---- Quality engineering ----
  { name: 'Rafael Mendoza', department: 'Engineering', title: 'Senior QA Engineer', hireDate: '2021-11-08', managerName: 'Saoirse Gallagher' },
  { name: 'Aisha Bakari', department: 'Engineering', title: 'QA Engineer', hireDate: '2022-08-15', managerName: 'Saoirse Gallagher' },
  { name: 'Yuki Tanaka', department: 'Engineering', title: 'QA Engineer', hireDate: '2023-06-12', managerName: 'Saoirse Gallagher' },
  { name: 'Oliver Kowalski', department: 'Engineering', title: 'QA Automation Engineer', hireDate: '2024-05-27', managerName: 'Saoirse Gallagher' },

  // ---- Design ----
  { name: 'Zara Malik', department: 'Design', title: 'Senior Product Designer', hireDate: '2021-08-23', managerName: 'Mateus Oliveira' },
  { name: 'Lucas Fontaine', department: 'Design', title: 'Product Designer', hireDate: '2023-02-13', managerName: 'Mateus Oliveira' },
  { name: 'Nadia Petrova', department: 'Design', title: 'UX Researcher', hireDate: '2024-09-16', managerName: 'Mateus Oliveira' },

  // ---- Analytics ----
  { name: 'Arjun Krishnan', department: 'Analytics', title: 'Senior Data Analyst', hireDate: '2022-01-31', managerName: 'Farida Haddad' },
  { name: 'Bianca Lombardi', department: 'Analytics', title: 'Data Analyst', hireDate: '2023-07-24', managerName: 'Farida Haddad' },
  { name: 'Sipho Ndlovu', department: 'Analytics', title: 'Data Engineer', hireDate: '2024-03-11', managerName: 'Farida Haddad' },

  // ---- Sales ----
  { name: 'Grace O’Sullivan', department: 'Sales', title: 'Account Executive', hireDate: '2021-05-10', managerName: 'Anders Lindqvist' },
  { name: 'Hassan Farouk', department: 'Sales', title: 'Account Executive', hireDate: '2022-06-27', managerName: 'Anders Lindqvist' },
  { name: 'Elena Marchetti', department: 'Sales', title: 'Sales Development Representative', hireDate: '2023-09-18', managerName: 'Anders Lindqvist' },
  { name: 'Tobias Berg', department: 'Sales', title: 'Sales Development Representative', hireDate: '2024-01-08', status: 'terminated', managerName: 'Anders Lindqvist' },
  { name: 'Camila Duarte', department: 'Sales', title: 'Solutions Engineer', hireDate: '2022-10-03', managerName: 'Anders Lindqvist' },

  // ---- People ----
  { name: 'Ruth Feldman', department: 'People', title: 'Recruiter', hireDate: '2021-03-15', managerName: 'Naomi Okonkwo' },
  { name: 'Joon-ho Seo', department: 'People', title: 'Recruiter', hireDate: '2023-05-22', managerName: 'Naomi Okonkwo' },
  { name: 'Adaeze Obi', department: 'People', title: 'People Operations Specialist', hireDate: '2024-07-01', managerName: 'Naomi Okonkwo' },

  // ---- Finance ----
  { name: 'Marek Nowak', department: 'Finance', title: 'Financial Analyst', hireDate: '2022-04-18', managerName: 'Gustavo Ferreira' },
  { name: 'Sofia Herrera', department: 'Finance', title: 'Accountant', hireDate: '2023-11-06', managerName: 'Gustavo Ferreira' },
```

- [ ] **Step 4: Reseed and run the test**

Run: `npx vitest run prisma/seed.test.ts`

Expected: PASS — both the fixture-preservation tests and the new roster tests.
The `beforeAll` reseeds, so no separate seed command is needed.

Depth check: `Yuki Tanaka` → `Saoirse Gallagher` → `Priyanka Venkatesan` →
`Rosalind Achebe` is four levels.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed-data/employees.ts prisma/seed.test.ts
git commit -m "feat: expand seed to 42 employees across six departments"
```

---

## Task 6: Expand postings and applicants

**Files:**
- Modify: `prisma/seed-data/postings.ts`
- Modify: `prisma/seed-data/applicants.ts`
- Test: `prisma/seed.test.ts`

**Interfaces:**
- Consumes: `SeedPosting`, `SeedApplicant`, and `daysAgo` from Task 4.
- Produces: 7 postings (1 fixture + 6 new) and 46 applicants (1 fixture + 45
  new), unevenly distributed across the five stages, including at least one
  offer older than 10 days.

Every applicant's `stageChangedDaysAgo` is less than or equal to its
`appliedDaysAgo` — you cannot change stage before you applied. Applicants in
the `applied` stage have the two values equal, since they have never moved.

- [ ] **Step 1: Write the failing test**

Append to `prisma/seed.test.ts`:

```typescript
describe('seed — postings and applicants', () => {
  it('seeds at least 6 postings including a closed one', async () => {
    const postings = await db.jobPosting.findMany()
    expect(postings.length).toBeGreaterThanOrEqual(6)
    expect(postings.some((p) => p.status === 'closed')).toBe(true)
    expect(postings.some((p) => p.status === 'open')).toBe(true)
  })

  it('seeds at least 45 applicants across all five stages', async () => {
    const applicants = await db.applicant.findMany()
    expect(applicants.length).toBeGreaterThanOrEqual(45)

    const byStage = new Map<string, number>()
    for (const a of applicants) {
      byStage.set(a.stage, (byStage.get(a.stage) ?? 0) + 1)
    }
    for (const stage of ['applied', 'interview', 'offer', 'hired', 'rejected']) {
      expect(byStage.get(stage) ?? 0).toBeGreaterThan(0)
    }
  })

  it('distributes applicants unevenly across stages', async () => {
    const applicants = await db.applicant.findMany()
    const counts = new Map<string, number>()
    for (const a of applicants) {
      counts.set(a.stage, (counts.get(a.stage) ?? 0) + 1)
    }
    // A uniform split would look synthetic; the pipeline should narrow.
    expect(counts.get('applied')!).toBeGreaterThan(counts.get('offer')!)
  })

  it('includes an offer aging past 10 days for the aging highlight', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    const aging = await db.applicant.count({
      where: { stage: 'offer', stageChangedAt: { lt: tenDaysAgo } },
    })
    expect(aging).toBeGreaterThanOrEqual(1)
  })

  it('never moves an applicant to a stage before they applied', async () => {
    const applicants = await db.applicant.findMany()
    for (const a of applicants) {
      expect(a.stageChangedAt.getTime()).toBeGreaterThanOrEqual(
        a.appliedAt.getTime()
      )
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run prisma/seed.test.ts -t "postings and applicants"`
Expected: FAIL — only 1 posting and 1 applicant exist.

- [ ] **Step 3: Add the six new postings**

Append to the `postings` array in `prisma/seed-data/postings.ts`:

```typescript
  { title: 'Senior QA Engineer', department: 'Engineering', status: 'open', createdByEmail: 'recruiter@elenchus.test' },
  { title: 'Platform Engineer', department: 'Engineering', status: 'open', createdByEmail: 'recruiter@elenchus.test' },
  { title: 'Product Designer', department: 'Design', status: 'open', createdByEmail: 'recruiter@elenchus.test' },
  { title: 'Data Analyst', department: 'Analytics', status: 'open', createdByEmail: 'manager@elenchus.test' },
  { title: 'Account Executive', department: 'Sales', status: 'open', createdByEmail: 'recruiter@elenchus.test' },
  { title: 'Engineering Manager, Payments', department: 'Engineering', status: 'closed', createdByEmail: 'admin@elenchus.test' },
```

- [ ] **Step 4: Add the 45 new applicants**

Append to the `applicants` array in `prisma/seed-data/applicants.ts`.
Distribution is 13 applied, 12 interview, 5 offer, 8 hired, 7 rejected — a
pipeline that narrows toward the top, as a real one does.

```typescript
  // ---- Applied (13) — never moved, so stageChangedDaysAgo === appliedDaysAgo ----
  { name: 'Priya Raghunathan', email: 'priya.raghunathan@example.com', postingTitle: 'Senior QA Engineer', stage: 'applied', appliedDaysAgo: 2, stageChangedDaysAgo: 2 },
  { name: 'Liam Okafor', email: 'liam.okafor@example.com', postingTitle: 'Data Analyst', stage: 'applied', appliedDaysAgo: 1, stageChangedDaysAgo: 1 },
  { name: 'Hana Sato', email: 'hana.sato@example.com', postingTitle: 'Platform Engineer', stage: 'applied', appliedDaysAgo: 5, stageChangedDaysAgo: 5 },
  { name: 'Ronan Byrne', email: 'ronan.byrne@example.com', postingTitle: 'Senior QA Engineer', stage: 'applied', appliedDaysAgo: 3, stageChangedDaysAgo: 3 },
  { name: 'Ingrid Solberg', email: 'ingrid.solberg@example.com', postingTitle: 'Product Designer', stage: 'applied', appliedDaysAgo: 6, stageChangedDaysAgo: 6 },
  { name: 'Diego Salazar', email: 'diego.salazar@example.com', postingTitle: 'Account Executive', stage: 'applied', appliedDaysAgo: 4, stageChangedDaysAgo: 4 },
  { name: 'Fatima Zahra', email: 'fatima.zahra@example.com', postingTitle: 'Platform Engineer', stage: 'applied', appliedDaysAgo: 8, stageChangedDaysAgo: 8 },
  { name: 'Nikolai Sorokin', email: 'nikolai.sorokin@example.com', postingTitle: 'Data Analyst', stage: 'applied', appliedDaysAgo: 2, stageChangedDaysAgo: 2 },
  { name: 'Aroha Ngata', email: 'aroha.ngata@example.com', postingTitle: 'Product Designer', stage: 'applied', appliedDaysAgo: 9, stageChangedDaysAgo: 9 },
  { name: 'Emeka Chukwu', email: 'emeka.chukwu@example.com', postingTitle: 'Senior QA Engineer', stage: 'applied', appliedDaysAgo: 1, stageChangedDaysAgo: 1 },
  { name: 'Lotte Jansen', email: 'lotte.jansen@example.com', postingTitle: 'Account Executive', stage: 'applied', appliedDaysAgo: 7, stageChangedDaysAgo: 7 },
  { name: 'Rashid Bin Talib', email: 'rashid.bintalib@example.com', postingTitle: 'Platform Engineer', stage: 'applied', appliedDaysAgo: 12, stageChangedDaysAgo: 12 },
  { name: 'Meera Pillai', email: 'meera.pillai@example.com', postingTitle: 'Data Analyst', stage: 'applied', appliedDaysAgo: 3, stageChangedDaysAgo: 3 },

  // ---- Interview (12) ----
  { name: 'Dana Whitfield', email: 'dana.whitfield@example.com', postingTitle: 'Senior QA Engineer', stage: 'interview', appliedDaysAgo: 19, stageChangedDaysAgo: 4 },
  { name: 'Yusuf Demir', email: 'yusuf.demir@example.com', postingTitle: 'Platform Engineer', stage: 'interview', appliedDaysAgo: 22, stageChangedDaysAgo: 6 },
  { name: 'Clara Lindgren', email: 'clara.lindgren@example.com', postingTitle: 'Product Designer', stage: 'interview', appliedDaysAgo: 17, stageChangedDaysAgo: 3 },
  { name: 'Ade Bakare', email: 'ade.bakare@example.com', postingTitle: 'Account Executive', stage: 'interview', appliedDaysAgo: 25, stageChangedDaysAgo: 8 },
  { name: 'Ravi Deshpande', email: 'ravi.deshpande@example.com', postingTitle: 'Data Analyst', stage: 'interview', appliedDaysAgo: 15, stageChangedDaysAgo: 2 },
  { name: 'Astrid Nilsen', email: 'astrid.nilsen@example.com', postingTitle: 'Senior QA Engineer', stage: 'interview', appliedDaysAgo: 28, stageChangedDaysAgo: 9 },
  { name: 'Bruno Cardoso', email: 'bruno.cardoso@example.com', postingTitle: 'Platform Engineer', stage: 'interview', appliedDaysAgo: 20, stageChangedDaysAgo: 5 },
  { name: 'Selin Kaya', email: 'selin.kaya@example.com', postingTitle: 'Product Designer', stage: 'interview', appliedDaysAgo: 16, stageChangedDaysAgo: 7 },
  { name: 'Thabo Molefe', email: 'thabo.molefe@example.com', postingTitle: 'Account Executive', stage: 'interview', appliedDaysAgo: 31, stageChangedDaysAgo: 11 },
  { name: 'Junko Ishikawa', email: 'junko.ishikawa@example.com', postingTitle: 'Data Analyst', stage: 'interview', appliedDaysAgo: 14, stageChangedDaysAgo: 1 },
  { name: 'Pierre Lacroix', email: 'pierre.lacroix@example.com', postingTitle: 'Senior QA Engineer', stage: 'interview', appliedDaysAgo: 23, stageChangedDaysAgo: 6 },
  { name: 'Noor Al-Sayegh', email: 'noor.alsayegh@example.com', postingTitle: 'Platform Engineer', stage: 'interview', appliedDaysAgo: 18, stageChangedDaysAgo: 4 },

  // ---- Offer (5) — Marcus and Beatriz are the aging offers ----
  { name: 'Marcus Oyelaran', email: 'marcus.oyelaran@example.com', postingTitle: 'Platform Engineer', stage: 'offer', appliedDaysAgo: 33, stageChangedDaysAgo: 11 },
  { name: 'Beatriz Alencar', email: 'beatriz.alencar@example.com', postingTitle: 'Senior QA Engineer', stage: 'offer', appliedDaysAgo: 41, stageChangedDaysAgo: 14 },
  { name: 'Oskar Novák', email: 'oskar.novak@example.com', postingTitle: 'Product Designer', stage: 'offer', appliedDaysAgo: 27, stageChangedDaysAgo: 5 },
  { name: 'Amina Diallo', email: 'amina.diallo@example.com', postingTitle: 'Account Executive', stage: 'offer', appliedDaysAgo: 24, stageChangedDaysAgo: 3 },
  { name: 'Henrik Dahl', email: 'henrik.dahl@example.com', postingTitle: 'Data Analyst', stage: 'offer', appliedDaysAgo: 30, stageChangedDaysAgo: 8 },

  // ---- Hired (8) ----
  { name: 'Ana Beatriz Lima', email: 'ana.lima@example.com', postingTitle: 'Senior QA Engineer', stage: 'hired', appliedDaysAgo: 52, stageChangedDaysAgo: 2 },
  { name: 'Viktor Petrenko', email: 'viktor.petrenko@example.com', postingTitle: 'Platform Engineer', stage: 'hired', appliedDaysAgo: 61, stageChangedDaysAgo: 13 },
  { name: 'Leila Hosseini', email: 'leila.hosseini@example.com', postingTitle: 'Product Designer', stage: 'hired', appliedDaysAgo: 48, stageChangedDaysAgo: 7 },
  { name: 'Samuel Adeyemi', email: 'samuel.adeyemi@example.com', postingTitle: 'Account Executive', stage: 'hired', appliedDaysAgo: 70, stageChangedDaysAgo: 21 },
  { name: 'Mei-Ling Zhou', email: 'meiling.zhou@example.com', postingTitle: 'Data Analyst', stage: 'hired', appliedDaysAgo: 55, stageChangedDaysAgo: 9 },
  { name: 'Jonas Vestergaard', email: 'jonas.vestergaard@example.com', postingTitle: 'Engineering Manager, Payments', stage: 'hired', appliedDaysAgo: 88, stageChangedDaysAgo: 34 },
  { name: 'Rhiannon Price', email: 'rhiannon.price@example.com', postingTitle: 'Senior QA Engineer', stage: 'hired', appliedDaysAgo: 44, stageChangedDaysAgo: 4 },
  { name: 'Karim Bouazizi', email: 'karim.bouazizi@example.com', postingTitle: 'Platform Engineer', stage: 'hired', appliedDaysAgo: 66, stageChangedDaysAgo: 17 },

  // ---- Rejected (7) ----
  { name: 'Sofia Almeida', email: 'sofia.almeida@example.com', postingTitle: 'Product Designer', stage: 'rejected', appliedDaysAgo: 23, stageChangedDaysAgo: 3 },
  { name: 'Callum Fraser', email: 'callum.fraser@example.com', postingTitle: 'Senior QA Engineer', stage: 'rejected', appliedDaysAgo: 37, stageChangedDaysAgo: 12 },
  { name: 'Nour Haddad', email: 'nour.haddad@example.com', postingTitle: 'Data Analyst', stage: 'rejected', appliedDaysAgo: 29, stageChangedDaysAgo: 6 },
  { name: 'Pavel Dvořák', email: 'pavel.dvorak@example.com', postingTitle: 'Platform Engineer', stage: 'rejected', appliedDaysAgo: 45, stageChangedDaysAgo: 19 },
  { name: 'Isabella Moretti', email: 'isabella.moretti@example.com', postingTitle: 'Account Executive', stage: 'rejected', appliedDaysAgo: 32, stageChangedDaysAgo: 8 },
  { name: 'Kofi Asante', email: 'kofi.asante@example.com', postingTitle: 'Engineering Manager, Payments', stage: 'rejected', appliedDaysAgo: 79, stageChangedDaysAgo: 40 },
  { name: 'Wanjiru Kamau', email: 'wanjiru.kamau@example.com', postingTitle: 'Senior QA Engineer', stage: 'rejected', appliedDaysAgo: 26, stageChangedDaysAgo: 5 },
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run prisma/seed.test.ts`
Expected: PASS — all groups, including fixture preservation and the roster
tests from Task 5.

- [ ] **Step 6: Run the full suite and build**

Run: `npm test && npm run build`
Expected: PASS, clean build.

- [ ] **Step 7: Commit**

```bash
git add prisma/seed-data/postings.ts prisma/seed-data/applicants.ts prisma/seed.test.ts
git commit -m "feat: expand seed to 7 postings and 46 applicants across all stages"
```

---

## Task 7: Prove the seed is deterministic

**Files:**
- Test: `prisma/seed.test.ts`

**Interfaces:**
- Consumes: `runSeed()` and all three data modules.
- Produces: nothing consumed by later tasks. This is the PBI 6.2 acceptance
  gate.

Row-for-row equality is impossible: `id` is `cuid()`, so every run produces
different primary keys, and foreign keys follow. Determinism here means **the
same records with the same values and the same relationships**, so the test
compares a normalised projection keyed on natural keys, with IDs excluded and
relations dereferenced to names.

This test is deliberately destructive — it wipes and reseeds the database
twice. It leaves the database in a correctly seeded state, which is the normal
development state, so this is safe. It is slow (two full seeds), hence the
extended timeout.

- [ ] **Step 1: Write the failing test**

Append to `prisma/seed.test.ts`:

```typescript
describe('seed — determinism', () => {
  /**
   * Projects the database to a stable, comparable shape: no cuid()s, relations
   * dereferenced to natural keys, deterministic ordering.
   */
  async function snapshot() {
    const employees = await db.employee.findMany({
      include: { manager: true, user: true },
      orderBy: { name: 'asc' },
    })
    const postings = await db.jobPosting.findMany({
      include: { createdBy: true },
      orderBy: { title: 'asc' },
    })
    const applicants = await db.applicant.findMany({
      include: { jobPosting: true },
      orderBy: [{ email: 'asc' }],
    })

    return {
      employees: employees.map((e) => ({
        name: e.name,
        department: e.department,
        title: e.title,
        hireDate: e.hireDate.toISOString(),
        status: e.status,
        manager: e.manager?.name ?? null,
        userEmail: e.user?.email ?? null,
      })),
      postings: postings.map((p) => ({
        title: p.title,
        department: p.department,
        status: p.status,
        createdBy: p.createdBy.email,
      })),
      applicants: applicants.map((a) => ({
        name: a.name,
        email: a.email,
        posting: a.jobPosting.title,
        stage: a.stage,
        appliedAt: a.appliedAt.toISOString(),
        stageChangedAt: a.stageChangedAt.toISOString(),
      })),
    }
  }

  it('produces identical state when run twice', async () => {
    await runSeed()
    const first = await snapshot()

    await runSeed()
    const second = await snapshot()

    expect(second).toEqual(first)
  }, 120_000)
})
```

- [ ] **Step 2: Run it**

Run: `npx vitest run prisma/seed.test.ts -t "produces identical state"`

Expected: PASS. If it fails on `appliedAt` or `stageChangedAt`, the seed is
using `now()` somewhere instead of `daysAgo()` — those are the only
time-valued fields, and `daysAgo()` is anchored to midnight UTC precisely so
two runs in the same day agree. If it fails only when run near midnight UTC,
that is the documented boundary caveat; rerun it.

- [ ] **Step 3: Confirm the database is left in a good state**

Run: `npx vitest run prisma/seed.test.ts`

Expected: PASS — every group. Running the whole file after the determinism
test proves the destructive test left a valid seeded database behind.

- [ ] **Step 4: Run the full suite and build**

Run: `npm test && npm run build`
Expected: PASS, clean build.

- [ ] **Step 5: Update the backlog**

In `docs/roadmap/backlog.md`, mark both PBIs done by changing their headings:

```markdown
### PBI 6.1 — [DONE] `stageChangedAt` field
### PBI 6.2 — [DONE] Seed expansion
```

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.test.ts docs/roadmap/backlog.md
git commit -m "test: prove seed determinism, mark PBIs 6.1 and 6.2 done"
```

---

## Acceptance Criteria Coverage

**PBI 6.1**

| Criterion | Task |
|---|---|
| Migration applies cleanly; existing rows get a sensible backfill | 1 |
| A stage transition updates `stageChangedAt` | 2 |
| Other applicant updates do not | 2 (true by construction — `UpdateApplicantSchema` has no `stage`) |
| OpenAPI spec reflects the new field | 3 |
| Existing stage tests still pass | 1, 2 |

**PBI 6.2**

| Criterion | Task |
|---|---|
| Running the seed twice yields identical state | 7 |
| Fixture users and existing records unchanged | 4 (test), 5, 6 |
| Hierarchy more than one level deep | 5 |
| Uneven, realistic stage distribution | 6 |
| At least one offer older than 10 days | 6 |
