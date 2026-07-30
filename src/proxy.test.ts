import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { signSession, SESSION_COOKIE } from '@/lib/auth'
import { proxy } from './proxy'

function makeRequest(opts: { cookie?: string; extraHeaders?: Record<string, string> } = {}) {
  const headers = new Headers(opts.extraHeaders)
  if (opts.cookie) {
    headers.set('cookie', `${SESSION_COOKIE}=${opts.cookie}`)
  }
  return new NextRequest('http://localhost/api/employees', { headers })
}

describe('proxy', () => {
  let roleId: string
  let userId: string
  let permId: string

  beforeAll(async () => {
    const role = await db.role.create({ data: { name: 'proxy-test-role' } })
    roleId = role.id
    const perm = await db.permission.create({ data: { key: 'proxy-test-permission' } })
    permId = perm.id
    await db.rolePermission.create({ data: { roleId, permissionId: permId } })
    const user = await db.user.create({
      data: { email: 'proxy-test@elenchus.test', passwordHash: 'x', roleId },
    })
    userId = user.id
  })

  afterAll(async () => {
    await db.user.delete({ where: { id: userId } })
    await db.rolePermission.deleteMany({ where: { roleId } })
    await db.permission.delete({ where: { id: permId } })
    await db.role.delete({ where: { id: roleId } })
  })

  it('does not set x-user-id or x-user-permissions when there is no session cookie', async () => {
    const request = makeRequest()
    const response = await proxy(request)
    expect(response.headers.get('x-middleware-request-x-user-id')).toBeNull()
    expect(response.headers.get('x-middleware-request-x-user-permissions')).toBeNull()
  })

  it('strips client-forged x-user-id/x-user-permissions headers when there is no valid session', async () => {
    const request = makeRequest({
      extraHeaders: {
        'x-user-id': 'forged-user',
        'x-user-permissions': 'manage_roles,edit_employees',
      },
    })
    const response = await proxy(request)
    expect(response.headers.get('x-middleware-request-x-user-id')).toBeNull()
    expect(response.headers.get('x-middleware-request-x-user-permissions')).toBeNull()
  })

  it('sets x-user-id and x-user-permissions from a valid session cookie', async () => {
    const token = signSession(userId)
    const request = makeRequest({ cookie: token })
    const response = await proxy(request)
    expect(response.headers.get('x-middleware-request-x-user-id')).toBe(userId)
    expect(response.headers.get('x-middleware-request-x-user-permissions')).toBe('proxy-test-permission')
  })
})
