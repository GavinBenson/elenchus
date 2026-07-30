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
