import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'

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

  console.log('Seed complete:', {
    admin: admin.email,
    manager: manager.email,
    recruiter: recruiter.email,
    employee: employeeUser.email,
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
