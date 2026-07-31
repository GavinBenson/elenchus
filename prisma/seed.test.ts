import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../src/lib/db'
import { runSeed } from './seed'
import { dayStart } from './seed-data/dates'

describe('seed — fixture preservation', () => {
  beforeAll(async () => {
    await runSeed()
  }, 60_000)

  afterAll(async () => {
    await db.$disconnect()
  })

  it('produces the exact expected record counts', async () => {
    const [userCount, employeeCount, postingCount, applicantCount] = await Promise.all([
      db.user.count(),
      db.employee.count(),
      db.jobPosting.count(),
      db.applicant.count(),
    ])
    expect(userCount).toBe(4)
    expect(employeeCount).toBe(2)
    expect(postingCount).toBe(1)
    expect(applicantCount).toBe(1)
  })

  it("links Morgan Manager's userId to manager@elenchus.test", async () => {
    const morgan = await db.employee.findFirstOrThrow({
      where: { name: 'Morgan Manager' },
      include: { user: true },
    })
    expect(morgan.user?.email).toBe('manager@elenchus.test')
  })

  it('sets Alex Applicant appliedAt and stageChangedAt to midnight UTC today', async () => {
    const alex = await db.applicant.findFirstOrThrow({
      where: { name: 'Alex Applicant' },
    })
    const expected = dayStart()
    expect(alex.appliedAt.toISOString()).toBe(expected.toISOString())
    expect(alex.stageChangedAt.toISOString()).toBe(expected.toISOString())
    expect(alex.appliedAt.toISOString()).toBe(alex.stageChangedAt.toISOString())
  })

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
