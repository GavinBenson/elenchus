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
