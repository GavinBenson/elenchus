import { db } from '../src/lib/db'
import { employees } from './seed-data/employees'
import { postings } from './seed-data/postings'
import { applicants } from './seed-data/applicants'
import { daysAgo, resetDayAnchor } from './seed-data/dates'

/**
 * A bcrypt hash of the literal password `password123` (cost 10), precomputed
 * once and inlined here on purpose. `bcrypt.hash()` generates a random salt on
 * every call, so hashing at seed time would make `User.passwordHash` differ on
 * every run and the seed would not be deterministic. Every fixture user shares
 * this hash; `password123` remains the login password for all of them.
 * `prisma/seed.test.ts` asserts `bcrypt.compare('password123', ...)` holds, so
 * this constant cannot silently rot into a hash of some other password.
 */
const PASSWORD123_HASH =
  '$2b$10$LZIzbV2JQTkBZhW0RVPqQOtob7vvz/BI0DrX6SCqNhlqcWvMMA9uS'

const PERMISSION_KEYS = [
  'view_all_employees',
  'edit_employees',
  'edit_job_postings',
  'delete_applicant',
  'manage_roles',
]

export async function runSeed() {
  // Destructive: this deletes every row in every seeded table before
  // recreating them. Refuse to run against production, mirroring the guard on
  // POST /api/test/reset.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'runSeed() is destructive (it deletes all seeded data) and is not available in production.'
    )
  }

  // Re-read the clock for this run before anything else. See the comment
  // above `anchor` in seed-data/dates.ts for why this must happen per run
  // rather than once per process.
  resetDayAnchor()

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

  const passwordHash = PASSWORD123_HASH

  // Fixture accounts are founding users; their creation date is historical and
  // has no reason to drift with the calendar, so it's set explicitly here
  // rather than via daysAgo() (mirrors how employee hireDate is handled).
  const admin = await db.user.create({
    data: {
      email: 'admin@elenchus.test',
      passwordHash,
      roleId: adminRole.id,
      createdAt: new Date('2026-01-15'),
    },
  })
  const manager = await db.user.create({
    data: {
      email: 'manager@elenchus.test',
      passwordHash,
      roleId: managerRole.id,
      createdAt: new Date('2026-01-20'),
    },
  })
  const recruiter = await db.user.create({
    data: {
      email: 'recruiter@elenchus.test',
      passwordHash,
      roleId: recruiterRole.id,
      createdAt: new Date('2026-01-22'),
    },
  })
  const employeeUser = await db.user.create({
    data: {
      email: 'employee@elenchus.test',
      passwordHash,
      roleId: employeeRole.id,
      createdAt: new Date('2026-01-25'),
    },
  })

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
    if (e.userEmail && !userIdByEmail[e.userEmail]) {
      throw new Error(
        `Seed data error: "${e.name}" lists userEmail "${e.userEmail}", who is not a defined fixture user.`
      )
    }
    if (employeeIdByName[e.name]) {
      throw new Error(`Seed data error: duplicate employee name "${e.name}".`)
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
    if (!userIdByEmail[p.createdByEmail]) {
      throw new Error(
        `Seed data error: posting "${p.title}" lists createdByEmail "${p.createdByEmail}", who is not a defined fixture user.`
      )
    }
    if (postingIdByTitle[p.title]) {
      throw new Error(`Seed data error: duplicate posting title "${p.title}".`)
    }
    const created = await db.jobPosting.create({
      data: {
        title: p.title,
        department: p.department,
        status: p.status,
        createdById: userIdByEmail[p.createdByEmail],
        createdAt: daysAgo(p.createdDaysAgo),
      },
    })
    postingIdByTitle[p.title] = created.id
  }

  // Applicant email and name are both natural keys here: the determinism
  // snapshot orders applicants by email, and fixture assertions look applicants
  // up by name. A duplicate of either makes ordering — and those lookups —
  // arbitrary, so reject them up front.
  const seenApplicantEmails = new Set<string>()
  const seenApplicantNames = new Set<string>()
  for (const a of applicants) {
    const jobPostingId = postingIdByTitle[a.postingTitle]
    if (!jobPostingId) {
      throw new Error(
        `Seed data error: applicant "${a.name}" references unknown posting "${a.postingTitle}".`
      )
    }
    if (seenApplicantEmails.has(a.email)) {
      throw new Error(`Seed data error: duplicate applicant email "${a.email}".`)
    }
    if (seenApplicantNames.has(a.name)) {
      throw new Error(`Seed data error: duplicate applicant name "${a.name}".`)
    }
    seenApplicantEmails.add(a.email)
    seenApplicantNames.add(a.name)
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

  console.log('Seed complete:', {
    users: 4,
    employees: employees.length,
    postings: postings.length,
    applicants: applicants.length,
  })
}

if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(() => db.$disconnect())
}
