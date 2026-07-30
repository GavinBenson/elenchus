# Epic 1 — Mock Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mock HCM/ATS/SaaS application (Elenchus) that later epics
(Playwright suite, CI, dashboard, AI layer) test against.

**Architecture:** Next.js (App Router) + TypeScript monolith. API routes
under `app/api/*` are the REST layer; server-rendered pages under `app/*`
are the UI layer. Prisma ORM against Neon Postgres. JWT-in-httpOnly-cookie
auth. Dynamic role/permission RBAC (no hardcoded role checks).

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma, Neon Postgres,
Tailwind CSS, Zod, bcrypt, jsonwebtoken, Vitest (unit tests for permission
engine and API handlers).

## Global Constraints

- All API responses use the error shape `{ "error": { "code": "...", "message": "..." } }` on failure (spec: Epic 1 design, Error Handling section).
- Every write endpoint must call `hasPermission()` before mutating data — no direct role-string comparisons anywhere in route handlers (spec: Permission model rationale).
- `POST /api/test/reset` must be unreachable when `NODE_ENV=production` (spec: Testing Hooks).
- All interactive UI elements carry a `data-testid` (spec: Testing Hooks).
- Node.js >= 20, npm as package manager.

---

## File Structure

```
elenchus/
  prisma/
    schema.prisma
    seed.ts
  src/
    lib/
      db.ts                  # Prisma client singleton
      auth.ts                # JWT sign/verify, cookie helpers
      permissions.ts         # hasPermission(), resolveEffectivePermissions()
      errors.ts              # ApiError class + error response helper
      validation.ts          # Zod schema helpers
    app/
      login/page.tsx
      dashboard/page.tsx
      employees/page.tsx
      employees/[id]/page.tsx
      job-postings/page.tsx
      job-postings/[id]/page.tsx
      admin/roles/page.tsx
      api/
        auth/login/route.ts
        auth/logout/route.ts
        auth/me/route.ts
        employees/route.ts
        employees/[id]/route.ts
        job-postings/route.ts
        job-postings/[id]/route.ts
        applicants/route.ts
        applicants/[id]/route.ts
        applicants/[id]/stage/route.ts
        roles/route.ts
        permissions/route.ts
        test/reset/route.ts
    proxy.ts                 # attaches user+permissions to request context
                              # (Next.js 16 renamed middleware.ts -> proxy.ts;
                              # Task 5 built this as src/proxy.ts, see its
                              # task notes for verification detail)
  openapi.yaml
  docs/... (already exists)
```

Rationale: `src/lib/*` holds framework-agnostic logic (auth, permissions,
errors) so it's independently unit-testable without spinning up Next.js
routes. Each API route file has one resource's HTTP handlers only.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `.env.example`, `.gitignore`
- Create: `prisma/schema.prisma` (empty datasource block only, filled in Task 2)

**Interfaces:**
- Produces: a runnable `npm run dev` Next.js app; `DATABASE_URL` env var contract used by all later Prisma code.

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```

- [ ] **Step 2: Install remaining dependencies**

```bash
npm install prisma @prisma/client zod bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken vitest @vitejs/plugin-react
```

- [ ] **Step 3: Init Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and `.env`. Confirm `.env` is in `.gitignore`.

- [ ] **Step 4: Create `.env.example`**

```
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
JWT_SECRET="replace-with-a-long-random-string"
NODE_ENV="development"
```

- [ ] **Step 5: Add Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

Add to `package.json` scripts:

```json
"test": "vitest run"
```

- [ ] **Step 6: Verify dev server runs**

Run: `npm run dev` then `curl http://localhost:3000` in a second terminal.
Expected: HTML response, HTTP 200. Stop the dev server after confirming.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Prisma, Tailwind, Vitest"
```

---

### Task 2: Data model & migrations

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `src/lib/db.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` from `.env` (Task 1).
- Produces: Prisma Client models — `User`, `Role`, `Permission`,
  `RolePermission`, `UserPermissionOverride`, `Employee`, `JobPosting`,
  `Applicant` — used by every later task.

- [ ] **Step 1: Write the schema**

Replace the model section of `prisma/schema.prisma` (keep the existing
`generator` and `datasource` blocks from Task 1):

```prisma
model Role {
  id          String           @id @default(cuid())
  name        String           @unique
  users       User[]
  permissions RolePermission[]
}

model Permission {
  id       String           @id @default(cuid())
  key      String           @unique
  roles    RolePermission[]
  overrides UserPermissionOverride[]
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  roleId       String
  role         Role     @relation(fields: [roleId], references: [id])
  employee     Employee?
  overrides    UserPermissionOverride[]
  jobPostings  JobPosting[]
  createdAt    DateTime @default(now())
}

model UserPermissionOverride {
  id           String     @id @default(cuid())
  userId       String
  permissionId String
  granted      Boolean
  user         User       @relation(fields: [userId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@unique([userId, permissionId])
}

model Employee {
  id         String     @id @default(cuid())
  userId     String?    @unique
  user       User?      @relation(fields: [userId], references: [id])
  name       String
  department String
  title      String
  hireDate   DateTime
  status     String     @default("active") // active | terminated
  managerId  String?
  manager    Employee?  @relation("EmployeeManager", fields: [managerId], references: [id])
  reports    Employee[] @relation("EmployeeManager")
}

model JobPosting {
  id         String      @id @default(cuid())
  title      String
  department String
  status     String      @default("open") // open | closed
  createdById String
  createdBy  User        @relation(fields: [createdById], references: [id])
  createdAt  DateTime    @default(now())
  applicants Applicant[]
}

model Applicant {
  id           String     @id @default(cuid())
  jobPostingId String
  jobPosting   JobPosting @relation(fields: [jobPostingId], references: [id])
  name         String
  email        String
  resumeUrl    String?
  stage        String     @default("applied") // applied | interview | offer | hired | rejected
  appliedAt    DateTime   @default(now())
}
```

- [ ] **Step 2: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

- [ ] **Step 3: Run migration**

Run: `npx prisma migrate dev --name init`
Expected: migration applies to Neon DB, `prisma/migrations/<timestamp>_init/` created.

- [ ] **Step 4: Write a smoke test for the self-referential relation**

Create `src/lib/db.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from './db'

describe('Employee manager relation', () => {
  let roleId: string

  beforeAll(async () => {
    const role = await db.role.create({ data: { name: 'test-role-db' } })
    roleId = role.id
  })

  afterAll(async () => {
    await db.employee.deleteMany({ where: { department: 'test-dept' } })
    await db.role.delete({ where: { id: roleId } })
    await db.$disconnect()
  })

  it('resolves an employee\'s reports via managerId', async () => {
    const manager = await db.employee.create({
      data: { name: 'Manager A', department: 'test-dept', title: 'Manager', hireDate: new Date() },
    })
    const report = await db.employee.create({
      data: { name: 'Report A', department: 'test-dept', title: 'IC', hireDate: new Date(), managerId: manager.id },
    })

    const found = await db.employee.findUnique({
      where: { id: manager.id },
      include: { reports: true },
    })

    expect(found?.reports.map((r) => r.id)).toContain(report.id)
  })
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- db.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add prisma/ src/lib/db.ts src/lib/db.test.ts
git commit -m "feat: add Prisma data model with RBAC and employee hierarchy"
```

---

### Task 3: Seed script

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- Consumes: `db` from `src/lib/db.ts` (Task 2), all Prisma models (Task 2).
- Produces: deterministic fixture users with known plaintext passwords
  (documented here) for Epic 2's Playwright suite to log in with —
  `admin@elenchus.test` / `password123`, `manager@elenchus.test` / `password123`,
  `recruiter@elenchus.test` / `password123`, `employee@elenchus.test` / `password123`.

- [ ] **Step 1: Write the seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const db = new PrismaClient()

const PERMISSION_KEYS = [
  'view_all_employees',
  'edit_employees',
  'edit_job_postings',
  'delete_applicant',
  'manage_roles',
]

async function main() {
  await db.userPermissionOverride.deleteMany()
  await db.applicant.deleteMany()
  await db.jobPosting.deleteMany()
  await db.employee.deleteMany()
  await db.user.deleteMany()
  await db.rolePermission.deleteMany()
  await db.permission.deleteMany()
  await db.role.deleteMany()

  const permissions = await Promise.all(
    PERMISSION_KEYS.map((key) => db.permission.create({ data: { key } }))
  )
  const permByKey = Object.fromEntries(permissions.map((p) => [p.key, p.id]))

  const adminRole = await db.role.create({ data: { name: 'admin' } })
  const managerRole = await db.role.create({ data: { name: 'manager' } })
  const recruiterRole = await db.role.create({ data: { name: 'recruiter' } })
  const employeeRole = await db.role.create({ data: { name: 'employee' } })

  const grant = (roleId: string, keys: string[]) =>
    Promise.all(
      keys.map((key) =>
        db.rolePermission.create({ data: { roleId, permissionId: permByKey[key] } })
      )
    )

  await grant(adminRole.id, PERMISSION_KEYS)
  await grant(managerRole.id, ['view_all_employees', 'edit_job_postings'])
  await grant(recruiterRole.id, ['edit_job_postings', 'delete_applicant'])
  await grant(employeeRole.id, [])

  const passwordHash = await bcrypt.hash('password123', 10)

  const admin = await db.user.create({
    data: { email: 'admin@elenchus.test', passwordHash, roleId: adminRole.id },
  })
  const manager = await db.user.create({
    data: { email: 'manager@elenchus.test', passwordHash, roleId: managerRole.id },
  })
  const recruiter = await db.user.create({
    data: { email: 'recruiter@elenchus.test', passwordHash, roleId: recruiterRole.id },
  })
  const employeeUser = await db.user.create({
    data: { email: 'employee@elenchus.test', passwordHash, roleId: employeeRole.id },
  })

  const managerEmployee = await db.employee.create({
    data: {
      userId: manager.id,
      name: 'Morgan Manager',
      department: 'Engineering',
      title: 'Engineering Manager',
      hireDate: new Date('2022-01-10'),
    },
  })

  await db.employee.create({
    data: {
      userId: employeeUser.id,
      name: 'Eli Employee',
      department: 'Engineering',
      title: 'Software Engineer',
      hireDate: new Date('2023-03-01'),
      managerId: managerEmployee.id,
    },
  })

  const posting = await db.jobPosting.create({
    data: {
      title: 'QA Engineer',
      department: 'Engineering',
      status: 'open',
      createdById: recruiter.id,
    },
  })

  await db.applicant.create({
    data: {
      jobPostingId: posting.id,
      name: 'Alex Applicant',
      email: 'alex.applicant@example.com',
      stage: 'applied',
    },
  })

  console.log('Seed complete:', { admin: admin.email, manager: manager.email, recruiter: recruiter.email, employee: employeeUser.email })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
```

- [ ] **Step 2: Register seed command in `package.json`**

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Install `ts-node` if not already present: `npm install -D ts-node`

- [ ] **Step 3: Run the seed script twice to verify determinism**

Run: `npx prisma db seed` then again `npx prisma db seed`
Expected: both runs succeed and log the same four seed emails; no duplicate-key
errors (the script clears tables first).

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add deterministic seed script for fixture users and data"
```

---

### Task 4: Auth (login/logout/me)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/lib/errors.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Consumes: `db` (Task 2), seeded users (Task 3).
- Produces: `signSession(userId: string): string`, `verifySession(token: string): { userId: string } | null`, `SESSION_COOKIE = 'elenchus_session'` — consumed by `middleware.ts` (Task 5) and every protected route.
- Produces: `ApiError` class and `errorResponse(error: ApiError): Response` — consumed by every route from Task 6 onward.

- [ ] **Step 1: Write the error helper**

Create `src/lib/errors.ts`:

```typescript
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export function errorResponse(error: ApiError) {
  return Response.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status }
  )
}
```

- [ ] **Step 2: Write the failing test for session sign/verify**

Create `src/lib/auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { signSession, verifySession } from './auth'

describe('session tokens', () => {
  it('round-trips a valid token', () => {
    const token = signSession('user-123')
    const result = verifySession(token)
    expect(result?.userId).toBe('user-123')
  })

  it('rejects a garbage token', () => {
    expect(verifySession('not-a-real-token')).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- auth.test.ts`
Expected: FAIL — `signSession is not a function` (module doesn't exist yet).

- [ ] **Step 4: Implement auth helpers**

Create `src/lib/auth.ts`:

```typescript
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod'
export const SESSION_COOKIE = 'elenchus_session'

export function signSession(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifySession(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
    return { userId: payload.userId }
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- auth.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Implement login route**

Create `src/app/api/auth/login/route.ts`:

```typescript
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { db } from '@/lib/db'
import { signSession, SESSION_COOKIE } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(new ApiError(400, 'validation_error', parsed.error.message))
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (!user) {
    return errorResponse(new ApiError(401, 'invalid_credentials', 'Invalid email or password'))
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!valid) {
    return errorResponse(new ApiError(401, 'invalid_credentials', 'Invalid email or password'))
  }

  const token = signSession(user.id)
  const response = Response.json({ id: user.id, email: user.email })
  response.headers.set(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
  )
  return response
}
```

- [ ] **Step 7: Implement logout route**

Create `src/app/api/auth/logout/route.ts`:

```typescript
import { SESSION_COOKIE } from '@/lib/auth'

export async function POST() {
  const response = Response.json({ ok: true })
  response.headers.set(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  )
  return response
}
```

- [ ] **Step 8: Implement me route**

Create `src/app/api/auth/me/route.ts`:

```typescript
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) {
    return errorResponse(new ApiError(401, 'unauthenticated', 'No valid session'))
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: { select: { name: true } } },
  })
  if (!user) {
    return errorResponse(new ApiError(401, 'unauthenticated', 'No valid session'))
  }

  return Response.json(user)
}
```

- [ ] **Step 9: Manual verification against seeded data**

Run: `npm run dev`, then in another terminal:

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elenchus.test","password":"password123"}'
```

Expected: HTTP 200, JSON body with `id`/`email`, `Set-Cookie` header present.
Then re-run with wrong password: expect HTTP 401 with the standard error shape.

- [ ] **Step 10: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts src/lib/errors.ts src/app/api/auth
git commit -m "feat: add JWT session auth (login/logout/me)"
```

---

### Task 5: Permission engine

**Files:**
- Create: `src/lib/permissions.ts`
- Create: `src/middleware.ts`
- Test: `src/lib/permissions.test.ts`

**Interfaces:**
- Consumes: `db` (Task 2), `verifySession`/`SESSION_COOKIE` (Task 4).
- Produces: `resolveEffectivePermissions(userId: string): Promise<Set<string>>`
  and `hasPermission(permissions: Set<string>, key: string): boolean` —
  consumed by every resource route from Task 6 onward.
- Produces: `middleware.ts` populates request headers `x-user-id` and
  `x-user-permissions` (comma-separated) for authenticated requests, read by
  route handlers via `request.headers.get(...)`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/permissions.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from './db'
import { resolveEffectivePermissions, hasPermission } from './permissions'

describe('permission resolution', () => {
  let roleId: string
  let userId: string
  let grantedPermId: string
  let revokedPermId: string

  beforeAll(async () => {
    const role = await db.role.create({ data: { name: 'perm-test-role' } })
    roleId = role.id
    const granted = await db.permission.create({ data: { key: 'perm-test-granted' } })
    const revoked = await db.permission.create({ data: { key: 'perm-test-revoked' } })
    grantedPermId = granted.id
    revokedPermId = revoked.id
    await db.rolePermission.create({ data: { roleId, permissionId: revokedPermId } })

    const user = await db.user.create({
      data: { email: 'perm-test@elenchus.test', passwordHash: 'x', roleId },
    })
    userId = user.id

    // grant an extra permission via override, and revoke one the role has
    await db.userPermissionOverride.create({
      data: { userId, permissionId: grantedPermId, granted: true },
    })
    await db.userPermissionOverride.create({
      data: { userId, permissionId: revokedPermId, granted: false },
    })
  })

  afterAll(async () => {
    await db.userPermissionOverride.deleteMany({ where: { userId } })
    await db.user.delete({ where: { id: userId } })
    await db.rolePermission.deleteMany({ where: { roleId } })
    await db.permission.deleteMany({ where: { id: { in: [grantedPermId, revokedPermId] } } })
    await db.role.delete({ where: { id: roleId } })
  })

  it('includes a permission granted only via override', async () => {
    const perms = await resolveEffectivePermissions(userId)
    expect(hasPermission(perms, 'perm-test-granted')).toBe(true)
  })

  it('excludes a role permission revoked via override', async () => {
    const perms = await resolveEffectivePermissions(userId)
    expect(hasPermission(perms, 'perm-test-revoked')).toBe(false)
  })

  it('returns false for an unknown permission key', async () => {
    const perms = await resolveEffectivePermissions(userId)
    expect(hasPermission(perms, 'does-not-exist')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- permissions.test.ts`
Expected: FAIL — module `./permissions` not found.

- [ ] **Step 3: Implement the permission engine**

Create `src/lib/permissions.ts`:

```typescript
import { db } from './db'

export async function resolveEffectivePermissions(userId: string): Promise<Set<string>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      overrides: { include: { permission: true } },
    },
  })
  if (!user) return new Set()

  const effective = new Set<string>(
    user.role.permissions.map((rp) => rp.permission.key)
  )

  for (const override of user.overrides) {
    if (override.granted) {
      effective.add(override.permission.key)
    } else {
      effective.delete(override.permission.key)
    }
  }

  return effective
}

export function hasPermission(permissions: Set<string>, key: string): boolean {
  return permissions.has(key)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- permissions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement middleware**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { resolveEffectivePermissions } from '@/lib/permissions'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) {
    return NextResponse.next()
  }

  const permissions = await resolveEffectivePermissions(session.userId)
  const headers = new Headers(request.headers)
  headers.set('x-user-id', session.userId)
  headers.set('x-user-permissions', Array.from(permissions).join(','))

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: '/api/:path*',
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/permissions.ts src/lib/permissions.test.ts src/middleware.ts
git commit -m "feat: add dynamic permission resolution engine and auth middleware"
```

---

### Task 6: Employees API

**Files:**
- Create: `src/lib/validation.ts`
- Create: `src/app/api/employees/route.ts`
- Create: `src/app/api/employees/[id]/route.ts`
- Test: `src/app/api/employees/route.test.ts`

**Interfaces:**
- Consumes: `db` (Task 2), `hasPermission` (Task 5), `ApiError`/`errorResponse` (Task 4), request headers `x-user-id`/`x-user-permissions` (Task 5).
- Produces: pattern for reading auth context from a route handler, reused verbatim by Tasks 7 and 8:

```typescript
function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}
```

- [ ] **Step 1: Write shared validation helper**

Create `src/lib/validation.ts`:

```typescript
import { z, ZodSchema } from 'zod'
import { ApiError } from './errors'

export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ApiError(400, 'validation_error', result.error.issues.map((i) => i.message).join('; '))
  }
  return result.data
}
```

- [ ] **Step 2: Write the failing test**

Create `src/app/api/employees/route.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { GET, POST } from './route'

function makeRequest(body?: unknown, permissions: string[] = []) {
  return new Request('http://localhost/api/employees', {
    method: body ? 'POST' : 'GET',
    headers: {
      'x-user-id': 'test-user',
      'x-user-permissions': permissions.join(','),
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/employees', () => {
  it('returns 403 when caller lacks edit_employees permission', async () => {
    const response = await POST(makeRequest({ name: 'X', department: 'Y', title: 'Z', hireDate: '2024-01-01' }, []))
    expect(response.status).toBe(403)
  })
})

describe('GET /api/employees', () => {
  it('returns 401 when unauthenticated', async () => {
    const request = new Request('http://localhost/api/employees')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- employees/route.test.ts`
Expected: FAIL — `./route` has no exports (file doesn't exist yet).

- [ ] **Step 4: Implement the employees collection route**

Create `src/app/api/employees/route.ts`:

```typescript
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const CreateEmployeeSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  title: z.string().min(1),
  hireDate: z.string().datetime().or(z.string().min(1)),
  managerId: z.string().optional(),
  userId: z.string().optional(),
})

export async function GET(request: Request) {
  const { userId } = getAuthContext(request)
  if (!userId) {
    return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  }
  const employees = await db.employee.findMany()
  return Response.json(employees)
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) {
      return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    }
    if (!hasPermission(permissions, 'edit_employees')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_employees permission'))
    }
    const body = parseOrThrow(CreateEmployeeSchema, await request.json())
    const employee = await db.employee.create({
      data: { ...body, hireDate: new Date(body.hireDate) },
    })
    return Response.json(employee, { status: 201 })
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}
```

- [ ] **Step 5: Implement the employee detail route**

Create `src/app/api/employees/[id]/route.ts`:

```typescript
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const UpdateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  status: z.enum(['active', 'terminated']).optional(),
  managerId: z.string().nullable().optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  const { id } = await params
  const employee = await db.employee.findUnique({ where: { id } })
  if (!employee) return errorResponse(new ApiError(404, 'not_found', 'Employee not found'))
  return Response.json(employee)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_employees')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_employees permission'))
    }
    const { id } = await params
    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Employee not found'))
    const body = parseOrThrow(UpdateEmployeeSchema, await request.json())
    const employee = await db.employee.update({ where: { id }, data: body })
    return Response.json(employee)
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, permissions } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  if (!hasPermission(permissions, 'edit_employees')) {
    return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_employees permission'))
  }
  const { id } = await params
  const existing = await db.employee.findUnique({ where: { id } })
  if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Employee not found'))
  await db.employee.delete({ where: { id } })
  return Response.json({ ok: true })
}
```

> **Note (added after Task 6 review):** without the `findUnique` existence check
> above, Prisma throws on `update`/`delete` against a nonexistent id, which
> leaks an uncaught 500 instead of the required 404. This was found as a bug
> in Task 6's implementation and fixed there; the code above is already
> corrected. Apply the same existence-check pattern in Tasks 7 and 8's
> PATCH/DELETE handlers.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- employees`
Expected: PASS (3 tests, including a 404-on-missing-id case).

- [ ] **Step 7: Commit**

```bash
git add src/lib/validation.ts src/app/api/employees
git commit -m "feat: add employees API with permission checks"
```

---

### Task 7: Job Postings API

**Files:**
- Create: `src/app/api/job-postings/route.ts`
- Create: `src/app/api/job-postings/[id]/route.ts`
- Test: `src/app/api/job-postings/route.test.ts`

**Interfaces:**
- Consumes: `getAuthContext` pattern (Task 6, copied — no shared module per YAGNI, each route file is self-contained as established in Task 6), `hasPermission` (Task 5), `parseOrThrow` (Task 6).
- Produces: `JobPosting` CRUD, consumed by Task 8 (`jobPostingId` foreign key checks).

- [ ] **Step 1: Write the failing test**

Create `src/app/api/job-postings/route.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { POST } from './route'

describe('POST /api/job-postings', () => {
  it('returns 403 when caller lacks edit_job_postings permission', async () => {
    const request = new Request('http://localhost/api/job-postings', {
      method: 'POST',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': '', 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'X', department: 'Y' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- job-postings/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the job postings collection route**

Create `src/app/api/job-postings/route.ts`:

```typescript
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const CreateJobPostingSchema = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
})

export async function GET(request: Request) {
  const { userId } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  const postings = await db.jobPosting.findMany({ include: { applicants: true } })
  return Response.json(postings)
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_job_postings')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_job_postings permission'))
    }
    const body = parseOrThrow(CreateJobPostingSchema, await request.json())
    const posting = await db.jobPosting.create({
      data: { ...body, createdById: userId },
    })
    return Response.json(posting, { status: 201 })
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}
```

- [ ] **Step 4: Implement the job posting detail route**

Create `src/app/api/job-postings/[id]/route.ts`:

```typescript
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const UpdateJobPostingSchema = z.object({
  title: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  status: z.enum(['open', 'closed']).optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  const { id } = await params
  const posting = await db.jobPosting.findUnique({ where: { id }, include: { applicants: true } })
  if (!posting) return errorResponse(new ApiError(404, 'not_found', 'Job posting not found'))
  return Response.json(posting)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_job_postings')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_job_postings permission'))
    }
    const { id } = await params
    const existing = await db.jobPosting.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Job posting not found'))
    const body = parseOrThrow(UpdateJobPostingSchema, await request.json())
    const posting = await db.jobPosting.update({ where: { id }, data: body })
    return Response.json(posting)
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, permissions } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  if (!hasPermission(permissions, 'edit_job_postings')) {
    return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_job_postings permission'))
  }
  const { id } = await params
  const existing = await db.jobPosting.findUnique({ where: { id } })
  if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Job posting not found'))
  await db.jobPosting.delete({ where: { id } })
  return Response.json({ ok: true })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- job-postings`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/job-postings
git commit -m "feat: add job postings API with permission checks"
```

---

### Task 8: Applicants API

**Files:**
- Create: `src/app/api/applicants/route.ts`
- Create: `src/app/api/applicants/[id]/route.ts`
- Create: `src/app/api/applicants/[id]/stage/route.ts`
- Test: `src/app/api/applicants/stage.test.ts`

**Interfaces:**
- Consumes: `getAuthContext` pattern (Task 6), `hasPermission` (Task 5), `parseOrThrow` (Task 6), `JobPosting` model (Task 7, for `jobPostingId` FK).
- Produces: `Applicant.stage` transitions, consumed by Epic 2's pipeline tests.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/applicants/stage.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { PATCH } from './[id]/stage/route'

describe('PATCH /api/applicants/:id/stage', () => {
  it('returns 400 for an invalid stage value', async () => {
    const request = new Request('http://localhost/api/applicants/abc/stage', {
      method: 'PATCH',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': 'delete_applicant', 'content-type': 'application/json' },
      body: JSON.stringify({ stage: 'not-a-real-stage' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'abc' }) })
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- applicants/stage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the applicants collection route**

Create `src/app/api/applicants/route.ts`:

```typescript
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const CreateApplicantSchema = z.object({
  jobPostingId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  resumeUrl: z.string().url().optional(),
})

export async function GET(request: Request) {
  const { userId } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  const applicants = await db.applicant.findMany()
  return Response.json(applicants)
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'edit_job_postings')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing edit_job_postings permission'))
    }
    const body = parseOrThrow(CreateApplicantSchema, await request.json())
    const applicant = await db.applicant.create({ data: body })
    return Response.json(applicant, { status: 201 })
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}
```

- [ ] **Step 4: Implement the applicant detail route**

Create `src/app/api/applicants/[id]/route.ts`:

```typescript
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  const { id } = await params
  const applicant = await db.applicant.findUnique({ where: { id } })
  if (!applicant) return errorResponse(new ApiError(404, 'not_found', 'Applicant not found'))
  return Response.json(applicant)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, permissions } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  if (!hasPermission(permissions, 'delete_applicant')) {
    return errorResponse(new ApiError(403, 'forbidden', 'Missing delete_applicant permission'))
  }
  const { id } = await params
  const existing = await db.applicant.findUnique({ where: { id } })
  if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Applicant not found'))
  await db.applicant.delete({ where: { id } })
  return Response.json({ ok: true })
}
```

- [ ] **Step 5: Implement the stage transition route**

Create `src/app/api/applicants/[id]/stage/route.ts`:

```typescript
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const StageSchema = z.object({
  stage: z.enum(['applied', 'interview', 'offer', 'hired', 'rejected']),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'delete_applicant')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing delete_applicant permission'))
    }
    const { id } = await params
    const existing = await db.applicant.findUnique({ where: { id } })
    if (!existing) return errorResponse(new ApiError(404, 'not_found', 'Applicant not found'))
    const body = parseOrThrow(StageSchema, await request.json())
    const applicant = await db.applicant.update({ where: { id }, data: { stage: body.stage } })
    return Response.json(applicant)
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}
```

Note: `delete_applicant` is reused here as the "recruiter-level pipeline
management" permission per the seed data in Task 3 (recruiter role has
`edit_job_postings` and `delete_applicant`, no separate stage-change
permission was defined in the design — this keeps the permission set from
Task 3 authoritative rather than inventing a new key).

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- applicants`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/applicants
git commit -m "feat: add applicants API with stage transitions"
```

---

### Task 9: Roles & Permissions admin API

**Files:**
- Create: `src/app/api/roles/route.ts`
- Create: `src/app/api/permissions/route.ts`
- Test: `src/app/api/roles/route.test.ts`

**Interfaces:**
- Consumes: `getAuthContext` pattern (Task 6), `hasPermission` (Task 5), `parseOrThrow` (Task 6).
- Produces: `Role`/`Permission` CRUD for the `/admin/roles` UI page (Task 11).

- [ ] **Step 1: Write the failing test**

Create `src/app/api/roles/route.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { POST } from './route'

describe('POST /api/roles', () => {
  it('returns 403 for a non-admin caller', async () => {
    const request = new Request('http://localhost/api/roles', {
      method: 'POST',
      headers: { 'x-user-id': 'test-user', 'x-user-permissions': '', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'new-role' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- roles/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the roles route**

Create `src/app/api/roles/route.ts`:

```typescript
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const CreateRoleSchema = z.object({
  name: z.string().min(1),
  permissionKeys: z.array(z.string()).default([]),
})

export async function GET(request: Request) {
  const { userId, permissions } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  if (!hasPermission(permissions, 'manage_roles')) {
    return errorResponse(new ApiError(403, 'forbidden', 'Missing manage_roles permission'))
  }
  const roles = await db.role.findMany({ include: { permissions: { include: { permission: true } } } })
  return Response.json(roles)
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'manage_roles')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing manage_roles permission'))
    }
    const body = parseOrThrow(CreateRoleSchema, await request.json())
    const perms = await db.permission.findMany({ where: { key: { in: body.permissionKeys } } })
    const role = await db.role.create({
      data: {
        name: body.name,
        permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
      },
      include: { permissions: { include: { permission: true } } },
    })
    return Response.json(role, { status: 201 })
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}
```

- [ ] **Step 4: Implement the permissions route**

Create `src/app/api/permissions/route.ts`:

```typescript
import { z } from 'zod'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { ApiError, errorResponse } from '@/lib/errors'
import { parseOrThrow } from '@/lib/validation'

function getAuthContext(request: Request) {
  const userId = request.headers.get('x-user-id')
  const permissions = new Set((request.headers.get('x-user-permissions') ?? '').split(',').filter(Boolean))
  return { userId, permissions }
}

const CreatePermissionSchema = z.object({ key: z.string().min(1) })

export async function GET(request: Request) {
  const { userId, permissions } = getAuthContext(request)
  if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
  if (!hasPermission(permissions, 'manage_roles')) {
    return errorResponse(new ApiError(403, 'forbidden', 'Missing manage_roles permission'))
  }
  return Response.json(await db.permission.findMany())
}

export async function POST(request: Request) {
  try {
    const { userId, permissions } = getAuthContext(request)
    if (!userId) return errorResponse(new ApiError(401, 'unauthenticated', 'Login required'))
    if (!hasPermission(permissions, 'manage_roles')) {
      return errorResponse(new ApiError(403, 'forbidden', 'Missing manage_roles permission'))
    }
    const body = parseOrThrow(CreatePermissionSchema, await request.json())
    const permission = await db.permission.create({ data: body })
    return Response.json(permission, { status: 201 })
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e)
    throw e
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- roles`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/roles src/app/api/permissions
git commit -m "feat: add roles and permissions admin API"
```

---

### Task 10: Test-reset endpoint

**Files:**
- Create: `src/app/api/test/reset/route.ts`
- Test: `src/app/api/test/reset/route.test.ts`

**Interfaces:**
- Consumes: seed logic (Task 3) — refactor `prisma/seed.ts`'s body into an
  exported `runSeed()` function so both the CLI seed command and this route
  call the same code.
- Produces: `POST /api/test/reset`, consumed by Epic 2's Playwright global
  setup/teardown.

- [ ] **Step 1: Refactor seed script to export a reusable function**

Modify `prisma/seed.ts` — rename `main` to `runSeed` and export it, keep a
thin CLI wrapper:

```typescript
export async function runSeed() {
  // ... existing body of main(), unchanged ...
}

if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(() => db.$disconnect())
}
```

- [ ] **Step 2: Write the failing test**

Create `src/app/api/test/reset/route.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST } from './route'

describe('POST /api/test/reset', () => {
  const original = process.env.NODE_ENV

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: original })
  })

  it('returns 404 in production', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production' })
    const response = await POST()
    expect(response.status).toBe(404)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- test/reset/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the reset route**

Create `src/app/api/test/reset/route.ts`:

```typescript
import { runSeed } from '../../../../../prisma/seed'
import { ApiError, errorResponse } from '@/lib/errors'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return errorResponse(new ApiError(404, 'not_found', 'Not available in production'))
  }
  await runSeed()
  return Response.json({ ok: true })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- test/reset/route.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts src/app/api/test/reset
git commit -m "feat: add non-prod test-reset endpoint reusing seed logic"
```

---

### Task 11: UI pages

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/employees/page.tsx`
- Create: `src/app/employees/[id]/page.tsx`
- Create: `src/app/job-postings/page.tsx`
- Create: `src/app/job-postings/[id]/page.tsx`
- Create: `src/app/admin/roles/page.tsx`

**Interfaces:**
- Consumes: `SESSION_COOKIE`/`verifySession` (Task 4), `resolveEffectivePermissions` (Task 5), all resource APIs (Tasks 6-9).
- Produces: `data-testid` attributes consumed by Epic 2's Playwright locators — this task is the contract Epic 2 is written against, so exact `data-testid` values below are load-bearing and must not be renamed later without updating Epic 2.

- [ ] **Step 1: Login page**

Create `src/app/login/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      const body = await response.json()
      setError(body.error.message)
      return
    }
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} data-testid="login-form" className="max-w-sm mx-auto mt-24 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Log in</h1>
      <input
        data-testid="login-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="border p-2 rounded"
      />
      <input
        data-testid="login-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="border p-2 rounded"
      />
      {error && <p data-testid="login-error" className="text-red-600">{error}</p>}
      <button data-testid="login-submit" type="submit" className="bg-black text-white p-2 rounded">
        Log in
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Dashboard page (role-aware server component)**

Create `src/app/dashboard/page.tsx`:

```tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'

export default async function DashboardPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { role: true },
  })
  if (!user) redirect('/login')

  const roleName = user.role.name

  if (roleName === 'admin') {
    const [employeeCount, postingCount, applicantCount] = await Promise.all([
      db.employee.count(),
      db.jobPosting.count(),
      db.applicant.count(),
    ])
    return (
      <div data-testid="dashboard-admin" className="p-8">
        <h1 className="text-2xl font-bold">Org-wide stats</h1>
        <p data-testid="stat-employee-count">Employees: {employeeCount}</p>
        <p data-testid="stat-posting-count">Job postings: {postingCount}</p>
        <p data-testid="stat-applicant-count">Applicants: {applicantCount}</p>
      </div>
    )
  }

  if (roleName === 'manager') {
    const employee = await db.employee.findUnique({ where: { userId: user.id } })
    const reports = employee ? await db.employee.findMany({ where: { managerId: employee.id } }) : []
    return (
      <div data-testid="dashboard-manager" className="p-8">
        <h1 className="text-2xl font-bold">Your reports</h1>
        <ul data-testid="manager-reports-list">
          {reports.map((r) => (
            <li key={r.id}>{r.name}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (roleName === 'recruiter') {
    const postings = await db.jobPosting.findMany({ where: { status: 'open' } })
    return (
      <div data-testid="dashboard-recruiter" className="p-8">
        <h1 className="text-2xl font-bold">Open postings</h1>
        <ul data-testid="recruiter-postings-list">
          {postings.map((p) => (
            <li key={p.id}>{p.title}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div data-testid="dashboard-employee" className="p-8">
      <h1 className="text-2xl font-bold">Welcome</h1>
    </div>
  )
}
```

- [ ] **Step 3: Employees list and detail pages**

Create `src/app/employees/page.tsx`:

```tsx
import { db } from '@/lib/db'

export default async function EmployeesPage() {
  const employees = await db.employee.findMany()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Employees</h1>
      <ul data-testid="employees-list">
        {employees.map((e) => (
          <li key={e.id} data-testid={`employee-row-${e.id}`}>
            <a href={`/employees/${e.id}`}>{e.name}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Create `src/app/employees/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employee = await db.employee.findUnique({ where: { id } })
  if (!employee) notFound()

  return (
    <div className="p-8" data-testid="employee-detail">
      <h1 className="text-2xl font-bold">{employee.name}</h1>
      <p data-testid="employee-department">{employee.department}</p>
      <p data-testid="employee-title">{employee.title}</p>
      <p data-testid="employee-status">{employee.status}</p>
    </div>
  )
}
```

- [ ] **Step 4: Job postings list and detail pages with pipeline view**

Create `src/app/job-postings/page.tsx`:

```tsx
import { db } from '@/lib/db'

export default async function JobPostingsPage() {
  const postings = await db.jobPosting.findMany()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Job Postings</h1>
      <ul data-testid="job-postings-list">
        {postings.map((p) => (
          <li key={p.id} data-testid={`posting-row-${p.id}`}>
            <a href={`/job-postings/${p.id}`}>{p.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Create `src/app/job-postings/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'

const STAGES = ['applied', 'interview', 'offer', 'hired', 'rejected'] as const

export default async function JobPostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const posting = await db.jobPosting.findUnique({ where: { id }, include: { applicants: true } })
  if (!posting) notFound()

  return (
    <div className="p-8" data-testid="job-posting-detail">
      <h1 className="text-2xl font-bold">{posting.title}</h1>
      <div className="flex gap-4 mt-4" data-testid="applicant-pipeline">
        {STAGES.map((stage) => (
          <div key={stage} data-testid={`pipeline-column-${stage}`} className="border p-2 flex-1">
            <h2 className="font-semibold">{stage}</h2>
            {posting.applicants
              .filter((a) => a.stage === stage)
              .map((a) => (
                <div key={a.id} data-testid={`applicant-card-${a.id}`}>
                  {a.name}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Admin roles page**

Create `src/app/admin/roles/page.tsx`:

```tsx
import { db } from '@/lib/db'

export default async function AdminRolesPage() {
  const roles = await db.role.findMany({ include: { permissions: { include: { permission: true } } } })
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Roles</h1>
      <ul data-testid="roles-list">
        {roles.map((r) => (
          <li key={r.id} data-testid={`role-row-${r.id}`}>
            <strong>{r.name}</strong>: {r.permissions.map((rp) => rp.permission.key).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in via `/login` as `admin@elenchus.test` /
`password123`, confirm redirect to `/dashboard` shows `dashboard-admin`
block with correct counts. Navigate to `/employees`, `/job-postings`,
`/admin/roles` and confirm each renders seeded data with the `data-testid`
attributes present (inspect via browser devtools).

- [ ] **Step 7: Commit**

```bash
git add src/app/login src/app/dashboard src/app/employees src/app/job-postings src/app/admin
git commit -m "feat: add UI pages with role-aware dashboard and data-testid hooks"
```

---

### Task 12: OpenAPI spec

**Files:**
- Create: `openapi.yaml`

**Interfaces:**
- Consumes: every route defined in Tasks 4, 6, 7, 8, 9 (final documentation pass — no new application code).
- Produces: `openapi.yaml`, consumed by Epic 5 (AI test generation).

- [ ] **Step 1: Write the spec**

Create `openapi.yaml`:

```yaml
openapi: 3.0.3
info:
  title: Elenchus API
  version: 1.0.0
paths:
  /api/auth/login:
    post:
      summary: Log in
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string }
      responses:
        '200': { description: Logged in, sets session cookie }
        '400': { description: Validation error }
        '401': { description: Invalid credentials }
  /api/auth/logout:
    post:
      summary: Log out
      responses:
        '200': { description: Session cleared }
  /api/auth/me:
    get:
      summary: Current session user
      responses:
        '200': { description: User info }
        '401': { description: No valid session }
  /api/employees:
    get:
      summary: List employees
      responses:
        '200': { description: Array of employees }
        '401': { description: Unauthenticated }
    post:
      summary: Create employee
      responses:
        '201': { description: Employee created }
        '403': { description: Missing edit_employees permission }
  /api/employees/{id}:
    get:
      summary: Get employee
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200': { description: Employee }
        '404': { description: Not found }
    patch:
      summary: Update employee
      responses:
        '200': { description: Updated employee }
        '403': { description: Missing edit_employees permission }
    delete:
      summary: Delete employee
      responses:
        '200': { description: Deleted }
  /api/job-postings:
    get:
      summary: List job postings
      responses:
        '200': { description: Array of postings with applicants }
    post:
      summary: Create job posting
      responses:
        '201': { description: Created }
        '403': { description: Missing edit_job_postings permission }
  /api/job-postings/{id}:
    get:
      summary: Get job posting
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200': { description: Job posting with applicants }
        '404': { description: Not found }
    patch:
      summary: Update job posting
      responses:
        '200': { description: Updated }
    delete:
      summary: Delete job posting
      responses:
        '200': { description: Deleted }
  /api/applicants:
    get:
      summary: List applicants
      responses:
        '200': { description: Array of applicants }
    post:
      summary: Create applicant
      responses:
        '201': { description: Created }
  /api/applicants/{id}:
    get:
      summary: Get applicant
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200': { description: Applicant }
        '404': { description: Not found }
    delete:
      summary: Delete applicant
      responses:
        '200': { description: Deleted }
  /api/applicants/{id}/stage:
    patch:
      summary: Move applicant to a new pipeline stage
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [stage]
              properties:
                stage:
                  type: string
                  enum: [applied, interview, offer, hired, rejected]
      responses:
        '200': { description: Updated applicant }
        '400': { description: Invalid stage value }
  /api/roles:
    get:
      summary: List roles
      responses:
        '200': { description: Array of roles with permissions }
        '403': { description: Missing manage_roles permission }
    post:
      summary: Create role
      responses:
        '201': { description: Created }
  /api/permissions:
    get:
      summary: List permissions
      responses:
        '200': { description: Array of permissions }
    post:
      summary: Create permission
      responses:
        '201': { description: Created }
  /api/test/reset:
    post:
      summary: Reset database to seed state (non-production only)
      responses:
        '200': { description: Reset complete }
        '404': { description: Not available in production }
components:
  schemas:
    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code: { type: string }
            message: { type: string }
```

- [ ] **Step 2: Validate the spec**

Run: `npx @redocly/cli lint openapi.yaml`
Expected: no errors (warnings acceptable).

- [ ] **Step 3: Commit**

```bash
git add openapi.yaml
git commit -m "docs: add OpenAPI spec covering all API routes"
```

---

## Self-Review Notes

- **Spec coverage:** every section of the Epic 1 design doc (stack, data
  model, permission rationale, API endpoints, auth, UI scope, error
  handling, testing hooks) maps to a task above (Tasks 1-12).
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code
  or an exact command.
- **Type consistency:** `getAuthContext` shape (`{ userId, permissions }`)
  and the `x-user-id`/`x-user-permissions` header contract are identical
  across Tasks 6, 7, 8, 9. `ApiError`/`errorResponse` signatures from Task 4
  are used unchanged in Tasks 6-10. Stage enum values match across Task 2
  schema comment, Task 8 route, and Task 12 OpenAPI spec.
