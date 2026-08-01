import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/navigation's redirect throws a special error to halt rendering. Model
// that: a redirect must stop execution, not fall through to the return.
const { redirectMock, cookieStore } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  cookieStore: { get: vi.fn() },
}))

vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))

import { requireSession, requirePermission } from './page-auth'
import { signSession } from './auth'
import { db } from './db'

describe('requireSession', () => {
  beforeEach(() => {
    redirectMock.mockClear()
    cookieStore.get.mockReset()
  })

  it('redirects to /login when there is no session cookie', async () => {
    cookieStore.get.mockReturnValue(undefined)
    await expect(requireSession()).rejects.toThrow('REDIRECT:/login')
    expect(redirectMock).toHaveBeenCalledWith('/login')
  })

  it('redirects to /login when the token is not valid', async () => {
    cookieStore.get.mockReturnValue({ value: 'not-a-real-token' })
    await expect(requireSession()).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects to /login when the token is valid but the user is gone', async () => {
    cookieStore.get.mockReturnValue({ value: signSession('deleted-user-id') })
    await expect(requireSession()).rejects.toThrow('REDIRECT:/login')
  })

  it('returns the user and their permissions for a valid session', async () => {
    const admin = await db.user.findFirstOrThrow({
      where: { email: 'admin@elenchus.test' },
    })
    cookieStore.get.mockReturnValue({ value: signSession(admin.id) })

    const { user, permissions } = await requireSession()
    expect(user.email).toBe('admin@elenchus.test')
    expect(user.role.name).toBe('admin')
    expect(permissions.has('view_all_employees')).toBe(true)
    expect(redirectMock).not.toHaveBeenCalled()
  })
})

describe('requirePermission', () => {
  beforeEach(() => {
    redirectMock.mockClear()
    cookieStore.get.mockReset()
  })

  it('redirects to /dashboard when the user lacks the permission', async () => {
    const employee = await db.user.findFirstOrThrow({
      where: { email: 'employee@elenchus.test' },
    })
    cookieStore.get.mockReturnValue({ value: signSession(employee.id) })

    await expect(requirePermission('view_all_employees')).rejects.toThrow(
      'REDIRECT:/dashboard'
    )
  })

  it('returns the user when they hold the permission', async () => {
    const admin = await db.user.findFirstOrThrow({
      where: { email: 'admin@elenchus.test' },
    })
    cookieStore.get.mockReturnValue({ value: signSession(admin.id) })

    const { user } = await requirePermission('view_all_employees')
    expect(user.email).toBe('admin@elenchus.test')
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('redirects an unauthenticated caller to /login, not /dashboard', async () => {
    cookieStore.get.mockReturnValue(undefined)
    await expect(requirePermission('view_all_employees')).rejects.toThrow(
      'REDIRECT:/login'
    )
  })
})
