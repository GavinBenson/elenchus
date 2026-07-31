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
    expect(employeeCount).toBe(42)
    expect(postingCount).toBe(7)
    expect(applicantCount).toBe(46)
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
        createdAt: p.createdAt.toISOString(),
      })),
      applicants: applicants.map((a) => ({
        name: a.name,
        email: a.email,
        posting: a.jobPosting.title,
        stage: a.stage,
        appliedAt: a.appliedAt.toISOString(),
        stageChangedAt: a.stageChangedAt.toISOString(),
        resumeUrl: a.resumeUrl,
      })),
    }
  }

  it('produces identical state when run twice', async () => {
    await runSeed()
    const first = await snapshot()

    await runSeed()
    const second = await snapshot()

    expect(first.employees.length).toBeGreaterThan(0)
    expect(first.postings.length).toBeGreaterThan(0)
    expect(first.applicants.length).toBeGreaterThan(0)

    expect(second).toEqual(first)
  }, 120_000)
})
