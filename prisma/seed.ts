import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import { employees } from './seed-data/employees'
import { postings } from './seed-data/postings'
import { applicants } from './seed-data/applicants'
import { daysAgo } from './seed-data/dates'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

const PERMISSION_KEYS = [
  'view_all_employees',
  'edit_employees',
  'edit_job_postings',
  'delete_applicant',
  'manage_roles',
]

export async function runSeed() {
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
